import appy from "../src";
import MarkdownIt from "markdown-it"

const text = `

&## test
	&<< 404 Not found error
		Encore un test

Euhhh

&@@ test
`

let mdit = MarkdownIt().use(appy);
console.log(mdit.render(text));