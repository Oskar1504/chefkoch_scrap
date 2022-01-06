# chefkoch_scrap
a script which gathers weekly recipe's

build upon an express application so u could host it as api after gathering the recipes.

i'll planned to use the data as data source for discord an telegram bot's

## usage
/api/main -> gathers all recipes from firt week in 2022 (based on the url in the function)

## Installation
clone repository

run in development mode (nodemon)
```bash
npm run dev
```

just run it
```bash
node server/server.js
```

## Chefkoch.de page analysis
```bash
https://www.chefkoch.de/wochenplan/schnelle-alltagskueche/1

https://www.chefkoch.de/wochenplan/<kategorie>/<kalenderwoche>

kategorien:
	- schnelle-alltagskueche
	- gesunde-ernaehrung
	- vegetarische-vielfalt
	- low-carb
kalenderwoche:
	- 1-52
		- einfach dann per js rausfinden default diese woche


html

ul .wr-card-list
   .wr-card-list__item
	.wr-card__link
	.wr-card__day
	.wr-card__title
	.wr-meta
		.wr-meta__item--clock
		

RDP (recipe detail page)
ingredients
table.ingredients tr
zubereuitung
document.querySelectorAll("[data-vars-tracking-title='Zubereitung']")[0].parentElement.querySelector("div.ds-box").innerText



```

