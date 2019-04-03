PACKAGE_NAME = textlink

.PHONY: all xpi

all: xpi

xpi:
	cd webextensions && $(MAKE)
	cp webextensions/$(PACKAGE_NAME)*.xpi ./

