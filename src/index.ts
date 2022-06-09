import type MarkdownIt from "markdown-it"
import Renderer from "markdown-it/lib/renderer";
import StateCore from "markdown-it/lib/rules_core/state_core";
import Token from "markdown-it/lib/token";
	
const
	_marker_global : number = 38 /* '&' */,
	_marker_route : number = 38 /* '&' */,
	_marker_response : number = 60 /* '<' */,
	_marker_define_reference : number = 35 /* '#' */,
	_marker_reference : number = 64 /* '@' */,
	_minMarkerLen_route : number = 2,
	_minMarkerLen_response : number = 2,
	_minMarkerLen_define_reference : number = 2,
	_minMarkerLen_reference : number = 2,
	_types_route = [
		"GET",  			//rgb(116, 173, 248);
		"POST",  		//rgb(112, 201, 149);
		"DELETE",   	//rgb(230, 79, 71);
		"PATCH",   		//rgb(124, 224, 195);
		"PUT",  			//rgb(239, 165, 74);
	],
	_types_response = [
		"success",		///^2\d{2}/  //rgba(0,200,83,.1) "\E876"
		"error"			///^4\d{2}   //rgba(255,23,68,.1)  "\E14C"
	]
	;

//let references : Map<string, {startLine: number, nextLine: number}>= new Map();

	export default function MarkdownItDOKAPI(md: MarkdownIt) {
		md.block.ruler.after("fence", "dokapi_define_reference", dokapiDefineReference);
		md.block.ruler.after("fence", "dokapi_reference", dokapiReference);
		md.block.ruler.after("fence", "dokapi_route", dokapiRoute);
		md.block.ruler.after("fence", "dokapi_response", dokapiResponse);
		md.core.ruler.after('block', 'dokapi_apply_reference', dokapiCoreApplyReference )

		md.renderer.rules["dokapi_route_open"] = renderRoute;
		md.renderer.rules["dokapi_route_details_open"] = renderRoute;
			md.renderer.rules["dokapi_route_summary_open"] = renderRoute;
			md.renderer.rules["dokapi_route_title_open"] = renderRoute;
				md.renderer.rules["dokapi_route_verb_open"] = renderRoute;
				md.renderer.rules["dokapi_route_verb_close"] = renderRoute;
				md.renderer.rules["dokapi_route_path_open"] = renderRoute;
				md.renderer.rules["dokapi_route_path_close"] = renderRoute;
				md.renderer.rules["dokapi_route_description_open"] = renderRoute;
				md.renderer.rules["dokapi_route_description_close"] = renderRoute;
			md.renderer.rules["dokapi_route_title_close"] = renderRoute;
			md.renderer.rules["dokapi_route_summary_close"] = renderRoute;
		md.renderer.rules["dokapi_route_details_close"] = renderRoute;
		md.renderer.rules["dokapi_route_close"] = renderRoute;

		md.renderer.rules["dokapi_response_open"] = renderResponse;
		md.renderer.rules["dokapi_response_details_open"] = renderResponse;
			md.renderer.rules["dokapi_response_summary_open"] = renderResponse;
			md.renderer.rules["dokapi_response_title_open"] = renderResponse;
				md.renderer.rules["dokapi_response_status_open"] = renderResponse;
				md.renderer.rules["dokapi_response_status_close"] = renderResponse;
				md.renderer.rules["dokapi_response_message_open"] = renderResponse;
				md.renderer.rules["dokapi_response_message_close"] = renderResponse;
			md.renderer.rules["dokapi_response_title_close"] = renderResponse;
			md.renderer.rules["dokapi_response_summary_close"] = renderResponse;
		md.renderer.rules["dokapi_response_details_close"] = renderResponse;
		md.renderer.rules["dokapi_response_close"] = renderResponse;

	}



	function copyToken(token : Token){
		let copyt : Token = new Token(token.type, token.tag, token.nesting);
		copyt.content = token.content;
		copyt.tag = token.tag;
		copyt.attrs = token.attrs;
		copyt.map = token.map;
		copyt.level = token.level;
		if(token.children)
			for(let child of token.children)
				copyt.children?.push(copyToken(child));
		copyt.children = [];
		copyt.markup = token.markup;
		copyt.info = token.info;
		copyt.meta = token.meta;
		copyt.block = token.block;
		copyt.hidden = token.hidden;
		return copyt;
	}


	function dokapiDefineReference(state: any, startLine: number, endLine: number, silent: boolean){
		let pos: number = state.bMarks[startLine] + state.tShift[startLine];
		let max: number = state.eMarks[startLine];
		let marker: number = state.src.charCodeAt(pos);
		if (marker !== _marker_global) 
			return false;

		// scan marker after and length
		let mem = pos;
		if(_marker_define_reference == _marker_global){
			pos = state.skipChars(pos, marker);
			let len = pos - mem;
			if (len < _minMarkerLen_define_reference + 1) 
				return false;
		}
		else{
			pos = state.skipChars(pos, marker);
			marker = state.src.charCodeAt(pos);
			if (marker !== _marker_define_reference) 
				return false;
			pos = state.skipChars(pos, marker);
			let len = pos - mem;
			if (len < _minMarkerLen_define_reference) 
				return false;
		}

		let params: string[] = state.src.slice(pos, max).trim().split(' ');
	
		let refname = params.shift();

		if (!refname) {
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
		for (; ;) {
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

		//references.set(refname, {startLine : startLine + 1, nextLine});
		//console.log(references);

		let token = state.push("dokapi_reference_open", "", 0);
		token.map = [startLine, nextLine];
		token.info = refname;
		token.block = false;

		state.md.block.tokenize(state, startLine + 1, nextLine);

		token = state.push("dokapi_reference_close", "", 0);
		token.map = [startLine, nextLine];
		token.block = false;

		state.parentType = oldParent;
		state.lineMax = oldLineMax;
		state.line = nextLine;
		state.blkIndent = oldIndent;
		return true;
	}

	function dokapiReference(state: any, startLine: number, endLine: number, silent: boolean){
		let pos: number = state.bMarks[startLine] + state.tShift[startLine];
		let max: number = state.eMarks[startLine];
		let marker: number = state.src.charCodeAt(pos);
		if (marker !== _marker_global) 
			return false;

		// scan marker after and length
		let mem = pos;
		if(_marker_reference == _marker_global){
			pos = state.skipChars(pos, marker);
			let len = pos - mem;
			if (len < _minMarkerLen_reference + 1) 
				return false;
		}
		else{
			pos = state.skipChars(pos, marker);
			marker = state.src.charCodeAt(pos);
			if (marker !== _marker_reference) 
				return false;
			pos = state.skipChars(pos, marker);
			let len = pos - mem;
			if (len < _minMarkerLen_reference) 
				return false;
		}

		let params: string[] = state.src.slice(pos, max).trim().split(' ');
	
		let refname = params.shift();

		if (!refname) {
			return false;
		}

		// Since start is found, we can report success here in validation mode
		if (silent) 
			return true;

		state.line = startLine + 1;

		// parse body
		let token = state.push("dokapi_reference", "", 0);
		token.info = refname;
		token.block = false;
		token.map    = [ startLine, state.line ];

		// parse body
		//state.md.block.tokenize(state, startLine + 1, endLine);


		return true;
	}

	function dokapiCoreApplyReference(state: StateCore){
		let refs : Map<string, Token[]> = new Map();
		
		let currentrefname = "";
		let active = false;

		// Parse defined references
		for(let token of state.tokens){
			if(token.type === 'dokapi_reference_open'){
				active = true;
				currentrefname = token.info;
				refs.set(token.info, []);
				continue;
			}
			if(token.type === 'dokapi_reference_close'){
				console.log('test');
				active = false;
				currentrefname = '';
			}

			if(active){
				let tokens = refs.get(currentrefname);

				if(tokens)
					tokens.push(copyToken(token));
			}
		}

		// Add reference
		for(let i = 0; i < state.tokens.length; i++){
			if(state.tokens[i].type === 'dokapi_reference'){
				let tokens = refs.get(state.tokens[i].info);
				if(!tokens)
					break;

				console.log(state.tokens[i].type);
				let j = 1;
				for(let t of tokens){
					state.tokens.splice(i + j, 0, t);
					j++;
				}

			}
		}

		state.tokens = state.tokens.filter(token => token.type !== 'dokapi_reference' && token.type !== 'dokapi_reference_open' && token.type !== 'dokapi_reference_close');
	}


	function renderRoute(tokens: Token[], idx: number, _options: any, env: any, self: Renderer) {
		var token = tokens[idx];
		if (token.type === "dokapi_route_open") {
			tokens[idx].attrJoin("class", "dokapi-route " + token.info);
		} else if (token.type === "dokapi_route_title_open") {
			tokens[idx].attrJoin("class", "dokapi-title");
		}
		else if (token.type === "dokapi_route_verb_open"){
			tokens[idx].attrJoin('class', "dokapi-verb");
		}
		else if (token.type === "dokapi_route_path_open"){
			tokens[idx].attrJoin('class', "dokapi-path");
		}
		else if (token.type === "dokapi_route_description_open"){
			tokens[idx].attrJoin('class', "dokapi-description");
		}
		return self.renderToken(tokens, idx, _options);
	}


	function dokapiRoute(state: any, startLine: number, endLine: number, silent: boolean) {
		// if it's indented more than 3 spaces, it should be a code block
		if (state.tShift[startLine] - state.blkIndent >= 4) return false;
		let pos: number = state.bMarks[startLine] + state.tShift[startLine];
		let max: number = state.eMarks[startLine];
		let marker: number = state.src.charCodeAt(pos);
		if (marker !== _marker_global) 
			return false;

		// scan marker after and length
		let mem = pos;
		if(_marker_route == _marker_global){
			pos = state.skipChars(pos, marker);
			let len = pos - mem;
			if (len < _minMarkerLen_route + 1) 
				return false;
		}
		else{
			pos = state.skipChars(pos, marker);
			marker = state.src.charCodeAt(pos);
			if (marker !== _marker_route) 
				return false;
			pos = state.skipChars(pos, marker);
			let len = pos - mem;
			if (len < _minMarkerLen_route) 
				return false;
		}

		let markup: string = state.src.slice(mem, pos);
		let params: string[] = state.src.slice(pos, max).trim().split(' ');
	
		let verb = params.shift();
		let path = params.shift();
		let description = params.join(' ');

		if (!verb || _types_route.indexOf(verb) < 0) {
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
		for (; ;) {
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
		let token = state.push("dokapi_route_open", "div", 1);
		token.markup = markup;
		token.block = true;
		token.info = verb;
		token.map = [startLine, startLine + 1];

		// Open details <details>
		token = state.push('dokapi_route_details_open', "details", 1);
		token.block = true;
		token.map = [startLine, startLine + 1];

			// Open summary <summary>
			token = state.push('dokapi_route_summary_open', "summary", 1);
			token.block = true;
			token.map = [startLine, startLine + 1];

			token = state.push('dokapi_route_title_open', "div", 1);
			token.block = true;
			token.map = [startLine, startLine + 1];

				// VERB
				token = state.push("dokapi_route_verb_open", "div", 1);
				token.block = true;
				token.map = [startLine, startLine + 1];

				token = state.push("inline", "", 0);
				token.content = verb;
				token.map = [startLine, startLine + 1];
				token.children = [];

				token = state.push("dokapi_route_verb_close", "div", -1);
				token.map = [startLine, nextLine];
				token.block = true;


				// ROUTE
				token = state.push("dokapi_route_path_open", "h3", 1);
				token.block = true;
				token.map = [startLine, startLine + 1];

				token = state.push("inline", "", 0);
				token.content = path;
				token.map = [startLine, startLine + 1];
				token.children = [];

				token = state.push("dokapi_route_path_close", "h3", -1);
				token.map = [startLine, nextLine];
				token.block = true;

				// DESCRIPTION
				token = state.push("dokapi_route_description_open", "p", 1);
				token.block = true;
				token.map = [startLine, startLine + 1];

				token = state.push("inline", "", 0);
				token.content = description;
				token.map = [startLine, startLine + 1];
				token.children = [];

				token = state.push("dokapi_route_description_close", "p", -1);
				token.map = [startLine, nextLine];
				token.block = true;

			token = state.push('dokapi_route_title_close', "div", -1);
			token.map = [startLine, nextLine];
			token.block = true;

			token = state.push('dokapi_route_summary_close', "summary", -1);
			token.map = [startLine, nextLine];
			token.block = true;

		// parse body
		state.md.block.tokenize(state, startLine + 1, nextLine);

		token = state.push('dokapi_route_details_close', "details", -1);
		token.map = [startLine, nextLine];
		token.block = true;

		token = state.push("dokapi_route_close", "div", -1);
		token.markup = markup;
		token.map = [startLine, nextLine];
		token.block = true;

		state.parentType = oldParent;
		state.lineMax = oldLineMax;
		state.line = nextLine;
		state.blkIndent = oldIndent;
		return true;
	}





	function renderResponse(tokens: Token[], idx: number, _options: any, env: any, self: Renderer) {
		var token = tokens[idx];
		if (token.type === "dokapi_response_open") {
			tokens[idx].attrJoin("class", "dokapi-response " + token.info);
		} else if (token.type === "dokapi_response_title_open") {
			tokens[idx].attrJoin("class", "dokapi-title");
		}
		else if (token.type === "dokapi_response_status_open"){
			tokens[idx].attrJoin('class', "dokapi-status");
		}
		else if (token.type === "dokapi_response_message_open"){
			tokens[idx].attrJoin('class', "dokapi-message");
		}
		return self.renderToken(tokens, idx, _options);
	}

	function dokapiResponse(state: any, startLine: number, endLine: number, silent: boolean) {

		// if it's indented more than 3 spaces, it should be a code block
		if (state.tShift[startLine] - state.blkIndent >= 4) return false;
		let pos: number = state.bMarks[startLine] + state.tShift[startLine];
		let max: number = state.eMarks[startLine];
		let marker: number = state.src.charCodeAt(pos);
		if (marker !== _marker_global) 
			return false;

		// scan marker after and length
		let mem = pos;
		if(_marker_response == _marker_global){
			pos = state.skipChars(pos, marker);
			let len = pos - mem;
			if (len < _minMarkerLen_response + 1) 
				return false;
		}
		else{
			pos = state.skipChars(pos, marker);
			marker = state.src.charCodeAt(pos);
			if (marker !== _marker_response) 
				return false;
			pos = state.skipChars(pos, marker);
			let len = pos - mem;
			if (len < _minMarkerLen_response) 
				return false;
		}

		let markup: string = state.src.slice(mem, pos);
		let params: string[] = state.src.slice(pos, max).trim().split(' ');
	
		let status = params.shift();
		let message : string | undefined = "";
		let responseclass = "";

		if (!status) {
			return false;
		}

		if(/2\d{2}/.test(status)){
			message = "OK";
			responseclass = "success";
		}
		else{
			message = params.join(' ');
			responseclass = "error";
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
		for (; ;) {
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
					// - &<<
					//  test
					break;
			}
		}

		state.parentType = "dokapi";
		// this will prevent lazy continuations from ever going past our end marker
		state.lineMax = nextLine;


		// Open route <div class="dokapi-response">
		let token = state.push("dokapi_response_open", "div", 1);
		token.markup = markup;
		token.block = true;
		token.info = responseclass;
		token.map = [startLine, startLine + 1];

		// Open details <details>
		token = state.push('dokapi_response_details_open', "details", 1);
		token.block = true;
		token.map = [startLine, startLine + 1];

			// Open summary <summary>
			token = state.push('dokapi_response_summary_open', "summary", 1);
			token.block = true;
			token.map = [startLine, startLine + 1];

			token = state.push('dokapi_response_title_open', "div", 1);
			token.block = true;
			token.map = [startLine, startLine + 1];

				// VERB
				token = state.push("dokapi_response_status_open", "h5", 1);
				token.block = true;
				token.map = [startLine, startLine + 1];

				token = state.push("inline", "", 0);
				token.content = status;
				token.map = [startLine, startLine + 1];
				token.children = [];

				token = state.push("dokapi_response_status_close", "h5", -1);
				token.map = [startLine, nextLine];
				token.block = true;

				// DESCRIPTION
				token = state.push("dokapi_response_message_open", "p", 1);
				token.block = true;
				token.map = [startLine, startLine + 1];

				token = state.push("inline", "", 0);
				token.content = message;
				token.map = [startLine, startLine + 1];
				token.children = [];

				token = state.push("dokapi_response_message_close", "p", -1);
				token.map = [startLine, nextLine];
				token.block = true;

			token = state.push('dokapi_response_title_close', "div", -1);
			token.map = [startLine, nextLine];
			token.block = true;

			token = state.push('dokapi_response_summary_close', "summary", -1);
			token.map = [startLine, nextLine];
			token.block = true;

		// parse body
		state.md.block.tokenize(state, startLine + 1, nextLine);

		token = state.push('dokapi_response_details_close', "details", -1);
		token.map = [startLine, nextLine];
		token.block = true;

		token = state.push("dokapi_response_close", "div", -1);
		token.markup = markup;
		token.map = [startLine, nextLine];
		token.block = true;

		state.parentType = oldParent;
		state.lineMax = oldLineMax;
		state.line = nextLine;
		state.blkIndent = oldIndent;
		return true;
	}