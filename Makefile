PACKAGE_NAME = textlink

.PHONY: all xpi signed clean

all: xpi

xpi: makexpi/makexpi.sh extlib/fxaddonlib-inherit/inherit.jsm extlib/webextensions-lib-configs/Configs.js
	cp extlib/fxaddonlib-inherit/inherit.jsm common/
	sed -e '/EXPORTED_SYMBOLS/d' -i common/inherit.jsm
	cp extlib/webextensions-lib-configs/Configs.js common/
	makexpi/makexpi.sh -n $(PACKAGE_NAME) -o

makexpi/makexpi.sh:
	git submodule update --init

extlib/fxaddonlib-inherit/inherit.jsm:
	git submodule update --init

extlib/webextensions-lib-configs/Configs.js:
	git submodule update --init

signed: xpi
	makexpi/sign_xpi.sh -k $(JWT_KEY) -s $(JWT_SECRET) -p ./$(PACKAGE_NAME)_noupdate.xpi

clean:
	rm $(PACKAGE_NAME).xpi $(PACKAGE_NAME)_noupdate.xpi sha1hash.txt
