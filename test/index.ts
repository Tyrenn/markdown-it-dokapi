import appy from "../src";
import MarkdownIt from "markdown-it"

const text = `
&&& POST /route/ One amazing title route
	The title route text
	
	Still inside route

Now it is time for next adventures
`

let mdit = MarkdownIt().use(appy);
console.log(mdit.render(text));