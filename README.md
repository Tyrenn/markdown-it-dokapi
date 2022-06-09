# Dokapi

Cool markdown commands to render api documentation.

Package largely inspired by [Markdown Extended](https://github.com/qjebbs/vscode-markdown-extended)

## Route block

`&&& [VERB] [path] [description]`

Verb can be `GET`, `POST`, `PUT`, `PATCH`, `DELETE`

```md
&&& GET /my/path My description

	Random markdown !

	Cool
```


## Response block

`&<< [status] [message]`

Message will be unparsed if status is success (2xx)

```md
&<< 200

	Response random markdown !
```


## Copy / References

`&## [keyword]`

Defines a reference with the name `keywords`. The reference will include everything indented and written below.

`&@@ [keyword]`

Repeat the block stored in `keyword` reference

Allows to define responses or errors once and repeat it inside API.

```md

&## error1
	&<< 404 Not Found

&&& GET /test/ Test route

	&<< 200

	&@@ error1
```

## Future features ?

I might add additionnal commands in the future... Feel free to discuss it in issues.
* Object Model ?
* Process bloc ?
* Request bloc ?