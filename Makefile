BUNDLE = demo/bundle.js
ENTRY = demo/main.js
SRC = index.js $(ENTRY)

$(BUNDLE): $(SRC)
	browserify -o $(BUNDLE) $(ENTRY)

watch:
	watchify -o $(BUNDLE) $(ENTRY)

clean:
	rm -f $(BUNDLE)
