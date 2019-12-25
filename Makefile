all:
	echo 'Maybe you wanted `clean`?'

clean:
	rm -rf node_modules/ package-lock.json tests/fixtures/bundle/node_modules

