require("dotenv").config()
const express = require('express')
const HTMLParser = require('node-html-parser');
const axios = require("axios");
const fs = require("fs");
const Log = require("./helper/Log");

const app = express()

app.use(express.json())

app.use(function (req, res, next) {
    Log.request(req.path)
    next()
})

app.get('/api/getWeekRecipes', async function (req, res) {

    let infos = []

    // week validation
    let now = new Date();
    let onejan = new Date(now.getFullYear(), 0, 1);
    let week_actual = Math.ceil((((now.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7)-1;

    let week_input = req.query.week?req.query.week:week_actual;

    if(week_actual-week_input >= 3 || week_actual-week_input <= -3){
        infos.push("week not matching actual week. chefkoch.de only forecast 2 weeks")
        week_input = week_actual + 2
    }

    // categorie validation
    let valid_cat = ["schnelle-alltagskueche", "gesunde-ernaehrung","vegetarische-vielfalt","low-carb"]
    let cat_input = req.query.categorie?req.query.categorie:valid_cat[0];

    if(!valid_cat.includes(cat_input)){
        cat_input = valid_cat[0];
        infos.push("Categorie isnt valid.Using default categorie: " +valid_cat[0] )
    }

    //check if wekk already scrapped
    if(!fs.existsSync(__dirname + `/data/${cat_input}/${week_input}.json`)) {

        let hostUrl = "https://www.chefkoch.de/wochenplan",
            url = `${hostUrl}/${cat_input}/${week_input}`
        await axios.get(url)
            .then(async function (response) {
                console.log(url, " | Success:", response.status);
                let root = HTMLParser.parse(response.data);
                let days = [...root.querySelectorAll("ul.wr-card-list .wr-card-list__item")]
                let recipes = []

                for (let day of days) {
                    let recipe_link = day.querySelectorAll(".wr-card__link")[0].getAttribute("href"),
                        recipe_url = `https://www.chefkoch.de${recipe_link}`,
                        more_data = {}
                    await axios.get(recipe_url)
                        .then(async function (response) {
                            console.log(recipe_url, " | Success:", response.status);
                            let root_recipe = HTMLParser.parse(response.data);
                            more_data = {
                                ingredients: [],
                                description: ""
                            }
                            for (let ingredient of [...root_recipe.querySelectorAll("table.ingredients tr")]) {
                                more_data.ingredients.push(sanitizeText(ingredient.text))
                            }

                            more_data.description = root_recipe.querySelector("[data-vars-tracking-title='Zubereitung']").parentNode.querySelector("div.ds-box").innerText

                        })
                        .catch(function (error) {
                            infos.push(error.toString())
                        })

                    recipes.push({
                        title: day.querySelectorAll(".wr-card__title")[0].text,
                        day: sanitizeText(day.querySelectorAll(".wr-card__day")[0].text),
                        categorie: cat_input,
                        day_num: dayToNum(sanitizeText(day.querySelectorAll(".wr-card__day")[0].text)),
                        link: recipe_link,
                        duration: sanitizeText(day.querySelectorAll(".wr-meta__item--clock")[0].text),
                        ingredients: more_data.ingredients,
                        description: more_data.description
                    })

                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                // store data
                fs.writeFileSync(__dirname + `/data/${cat_input}/${week_input}.json`, JSON.stringify(recipes, null, 4))

                res.json({
                    status: 200,
                    req_status: response.status,
                    recipes: recipes,
                    infos: infos
                })
            })
            .catch(function (error) {
                // handle error
                console.log(error.toString());
                res.json({error: error.toString()})
            })
    }else{
        infos.push("Week already scrapped. Using local storage")
        res.json({
            status: 200,
            recipes: JSON.parse(fs.readFileSync(__dirname + `/data/${cat_input}/${week_input}.json`)),
            infos: infos
        })
    }
})

app.get('/api/getTodaysRecipes', async function (req, res) {

    let infos = [],
        output = [],
        now = new Date(),
        today = now.getDay()-1, // -1 since day works as index for array monday is 0 but getday return 1
        onejan = new Date(now.getFullYear(), 0, 1),
        week_actual = Math.ceil((((now.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7)-1;


    // categorie validation
    let valid_cat = ["schnelle-alltagskueche", "gesunde-ernaehrung","vegetarische-vielfalt","low-carb"]

    for(let cat of valid_cat){
        // if cat data exist from this week
        if(fs.existsSync(__dirname + `/data/${cat}/${week_actual}.json`)) {
            let recipes = JSON.parse(fs.readFileSync(__dirname + `/data/${cat}/${week_actual}.json`))
            output.push(recipes[today])
        }else{
            infos.push(`Recipes from ${cat} arent scrapped for this week (${week_actual})`)
        }
    }
    res.json({
        status: 200,
        recipes: output,
        infos: infos
    })
})

app.get('/api/testParams', async function (req, res) {

    let infos = []

    // week validation
    let now = new Date();
    let onejan = new Date(now.getFullYear(), 0, 1);
    let week_actual = Math.ceil((((now.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7)-1;

    let week_input = req.query.week?req.query.week:week_actual;

    if(week_actual-week_input >= 3 || week_actual-week_input <= -3){
        infos.push("week not matching actual week. chefkoch.de only forecast 2 weeks")
        week_input = week_actual + 2
    }

    // categorie validation
    let valid_cat = ["schnelle-alltagskueche", "gesunde-ernaehrung","vegetarische-vielfalt","low-carb"]
    let cat_input = req.query.categorie?req.query.categorie:valid_cat[0];

    if(!valid_cat.includes(cat_input)){
        cat_input = valid_cat[0];
        infos.push("Categorie isnt valid.Using default categorie: " +valid_cat[0] )
    }

    res.json({
        categorie: req.params.categorie,
        week_input: week_input,
        week_actual: week_actual,
        cat_input: cat_input,
        infos: infos
    })
})


app.get('/api/getCategories', async function (req, res) {
    res.json({
        status:200,
        categorie: ["schnelle-alltagskueche", "gesunde-ernaehrung","vegetarische-vielfalt","low-carb"],
        infos: []
    })
})


app.get('/', async function (req, res) {
    res.json({
        status: "hallo"
    })
})

app.listen(process.env.PORT, function () {
    console.log(`${process.env.PROJECT_NAME} is running at http://localhost:${process.env.PORT}`)
    axios({
        method:"post",
        url: "http://localhost:42015/app/register",
        data:{
            project_name: process.env.PROJECT_NAME,
            project_description: process.env.PROJECT_DESCRIPTION,
            project_port: process.env.PORT
        }
    })
        .then(response => Log.success(response.data.data))
        .catch(error => Log.error(error.toString()))
})

//debug to console
console.log('\napp started. http://localhost:42069');

function sanitizeText(text){
    return text.replace(/\s\s+/g, '');
}

function dayToNum(day) {
    // need to use include since days sometimes include whitespace or other random character
    switch (true) {
        case /Montag/.test(day):
            return 1
            break
        case /Dienstag/.test(day):
            return 2
            break
        case /Mittwoch/.test(day):
            return 3
            break
        case /Donnerstag/.test(day):
            return 4
            break
        case /Freitag/.test(day):
            return 5
            break
        case /Samstag/.test(day):
            return 6
            break
        case /Sonntag/.test(day):
            return 7
            break
        default:
            return 1
    }
}