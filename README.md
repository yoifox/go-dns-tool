## Running
- `npm install`
- Change the suffix in config.json (optional)
- Change the host in config.json to your pc ip.
- Change your dns server in your network settings.
- Add your secret key and server certificate in the dns folder
- `npm start` or `npm net-install` to install as net service.
## Using
Try it: [go/](http://go/ "go/") or [go./](http://go./ "go./")
#### links.json
- **name:** put your go/ links here.
- **proxy:** put your proxy hosts here.
- **redirect:** put your redirect links here.

To use non existing TLDs in browser add `/` to end of host. If you use a TLD and your os does not append a suffix automatically add `./` at the end.

**Difference between name links and redirect links:**
Both redirect. Name links can be accessed using [go/example](http://go/example "go/example"). Redirect links can be accessed using simply [example/](http://example/ "example/").

The name go can be changed under name in links.json
