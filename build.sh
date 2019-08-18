rm -rf docs
parcel build src/index.html --no-source-maps  --public-url . --no-minify --out-dir docs
parcel build src/ts/markdowntodo.ts --no-source-maps  --public-url . --no-minify --out-dir docs --global markdowntodo
