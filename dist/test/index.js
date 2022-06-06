"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = __importDefault(require("../src"));
const markdown_it_1 = __importDefault(require("markdown-it"));
const text = `
&&& GET /route/ One amazing title route
	The title route text
	
	Still inside route

Now it is time for next adventures
`;
let mdit = markdown_it_1.default().use(src_1.default);
console.log(mdit.render(text));
//# sourceMappingURL=index.js.map