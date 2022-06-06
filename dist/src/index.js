"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _marker = 38 /* '&' */, _minMarkerLen = 3, _types = [
    "GET",
    "POST",
    "DELETE",
    "PATCH",
    "PUT",
];
function MarkdownItDOKAPI(md) {
    md.block.ruler.after("fence", "dokapi", dokapi);
    md.renderer.rules["dokapi_open"] = render;
    md.renderer.rules["dokapi_details_open"] = render;
    md.renderer.rules["dokapi_summary_open"] = render;
    md.renderer.rules["dokapi_title_open"] = render;
    md.renderer.rules["dokapi_verb_open"] = render;
    md.renderer.rules["dokapi_verb_close"] = render;
    md.renderer.rules["dokapi_route_open"] = render;
    md.renderer.rules["dokapi_route_close"] = render;
    md.renderer.rules["dokapi_description_open"] = render;
    md.renderer.rules["dokapi_description_close"] = render;
    md.renderer.rules["dokapi_title_close"] = render;
    md.renderer.rules["dokapi_summary_close"] = render;
    md.renderer.rules["dokapi_details_close"] = render;
    md.renderer.rules["dokapi_close"] = render;
}
exports.default = MarkdownItDOKAPI;
function render(tokens, idx, _options, env, self) {
    var token = tokens[idx];
    if (token.type === "dokapi_open") {
        tokens[idx].attrJoin("class", "dokapi-route " + token.info);
    }
    else if (token.type === "dokapi_title_open") {
        tokens[idx].attrJoin("class", "dokapi-title");
    }
    else if (token.type === "dokapi_verb_open") {
        tokens[idx].attrJoin('class', "dokapi-verb");
    }
    else if (token.type === "dokapi_route_open") {
        tokens[idx].attrJoin('class', "dokapi-route");
    }
    else if (token.type === "dokapi_description_open") {
        tokens[idx].attrJoin('class', "dokapi-description");
    }
    return self.renderToken(tokens, idx, _options);
}
function dokapi(state, startLine, endLine, silent) {
    // if it's indented more than 3 spaces, it should be a code block
    if (state.tShift[startLine] - state.blkIndent >= 4)
        return false;
    let pos = state.bMarks[startLine] + state.tShift[startLine];
    let max = state.eMarks[startLine];
    let marker = state.src.charCodeAt(pos);
    if (marker !== _marker)
        return false;
    // scan marker length
    let mem = pos;
    pos = state.skipChars(pos, marker);
    let len = pos - mem;
    if (len < _minMarkerLen)
        return false;
    let markup = state.src.slice(mem, pos);
    let params = state.src.slice(pos, max).trim().split(' ');
    let verb = params.shift();
    let route = params.shift();
    let description = params.join(' ');
    if (!verb || _types.indexOf(verb) < 0) {
        return false;
    }
    // Since start is found, we can report success here in validation mode
    if (silent)
        return true;
    let oldParent = state.parentType;
    let oldLineMax = state.lineMax;
    let oldIndent = state.blkIndent;
    state.blkIndent += 4;
    // search end of block
    let nextLine = startLine;
    for (;;) {
        nextLine++;
        if (nextLine >= endLine) {
            // unclosed block should be autoclosed by end of document.
            // also block seems to be autoclosed by end of parent
            break;
        }
        pos = mem = state.bMarks[nextLine] + state.tShift[nextLine];
        max = state.eMarks[nextLine];
        if (pos < max && state.sCount[nextLine] < state.blkIndent) {
            // non-empty line with negative indent should stop the list:
            // - !!!
            //  test
            break;
        }
    }
    state.parentType = "dokapi";
    // this will prevent lazy continuations from ever going past our end marker
    state.lineMax = nextLine;
    // Open route <div class="route">
    let token = state.push("dokapi_open", "div", 1);
    token.markup = markup;
    token.block = true;
    token.info = verb;
    token.map = [startLine, startLine + 1];
    // Open details <details>
    token = state.push('dokapi_details_open', "details", 1);
    token.block = true;
    token.map = [startLine, startLine + 1];
    // Open summary <summary>
    token = state.push('dokapi_summary_open', "summary", 1);
    token.block = true;
    token.map = [startLine, startLine + 1];
    token = state.push('dokapi_title_open', "div", 1);
    token.block = true;
    token.map = [startLine, startLine + 1];
    // VERB
    token = state.push("dokapi_verb_open", "div", 1);
    token.block = true;
    token.map = [startLine, startLine + 1];
    token = state.push("inline", "", 0);
    token.content = verb;
    token.map = [startLine, startLine + 1];
    token.children = [];
    token = state.push("dokapi_verb_close", "div", -1);
    token.map = [startLine, nextLine];
    token.block = true;
    // ROUTE
    token = state.push("dokapi_route_open", "h3", 1);
    token.block = true;
    token.map = [startLine, startLine + 1];
    token = state.push("inline", "", 0);
    token.content = route;
    token.map = [startLine, startLine + 1];
    token.children = [];
    token = state.push("dokapi_route_close", "h3", -1);
    token.map = [startLine, nextLine];
    token.block = true;
    // DESCRIPTION
    token = state.push("dokapi_description_open", "p", 1);
    token.block = true;
    token.map = [startLine, startLine + 1];
    token = state.push("inline", "", 0);
    token.content = description;
    token.map = [startLine, startLine + 1];
    token.children = [];
    token = state.push("dokapi_description_close", "p", -1);
    token.map = [startLine, nextLine];
    token.block = true;
    token = state.push('dokapi_title_close', "div", -1);
    token.map = [startLine, nextLine];
    token.block = true;
    token = state.push('dokapi_summary_close', "summary", -1);
    token.map = [startLine, nextLine];
    token.block = true;
    // parse body
    state.md.block.tokenize(state, startLine + 1, nextLine);
    token = state.push('dokapi_details_close', "details", -1);
    token.map = [startLine, nextLine];
    token.block = true;
    token = state.push("dokapi_close", "div", -1);
    token.markup = markup;
    token.map = [startLine, nextLine];
    token.block = true;
    state.parentType = oldParent;
    state.lineMax = oldLineMax;
    state.line = nextLine;
    state.blkIndent = oldIndent;
    return true;
}
//# sourceMappingURL=index.js.map