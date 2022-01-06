const express = require('express')
const HTMLParser = require('node-html-parser');
const axios = require("axios");
const fs = require("fs");

const app = express()

app.use(express.json())


app.get('/api/main', async function (req, res) {
    let hostUrl = "https://www.chefkoch.de/wochenplan",
        categorie = "schnelle-alltagskueche",
        week = "1",
        url = `${hostUrl}/${categorie}/${week}`
    await axios.get(url)
        .then(async function (response) {
            // handle success
            console.log(url , " | Success:", response.status);

            let root = HTMLParser.parse(response.data);

            let days = [...root.querySelectorAll("ul.wr-card-list .wr-card-list__item")]
            let o = []
            for(let day of days){
                let recipe_link = day.querySelectorAll(".wr-card__link")[0].getAttribute("href"),
                    recipe_url = `https://www.chefkoch.de${recipe_link}`,
                    more_data = {}
                await axios.get(recipe_url)
                    .then(async function (response) {
                        console.log(recipe_url , " | Success:", response.status);
                        let root_recipe = HTMLParser.parse(response.data);
                        more_data = {
                            ingredients: [],
                            description: ""
                        }
                        for(let ingredient of [...root_recipe.querySelectorAll("table.ingredients tr")]){
                            more_data.ingredients.push(sanitizeText(ingredient.text))
                        }

                        more_data.description = root_recipe.querySelector("[data-vars-tracking-title='Zubereitung']").parentNode.querySelector("div.ds-box").innerText


                    })
                    .catch(function (error) {
                        more_data = {error:error.toString()}
                    })

                o.push({
                    title: day.querySelectorAll(".wr-card__title")[0].text,
                    day: sanitizeText(day.querySelectorAll(".wr-card__day")[0].text),
                    link: recipe_link,
                    duration: sanitizeText(day.querySelectorAll(".wr-meta__item--clock")[0].text),
                    more_data: more_data
                })

                await new Promise(resolve => setTimeout(resolve, 1000));
            }


            res.json({
                status: 200,
                req_status: response.status,
                days: o
            })
        })
        .catch(function (error) {
            // handle error
            console.log(error.toString());
            res.json({error:error.toString()})
        })

})




app.listen(42069)

//debug to console
console.log('\napp started. http://localhost:42069');

function sanitizeText(text){
    return text.replace(/\s\s+/g, '');
}
