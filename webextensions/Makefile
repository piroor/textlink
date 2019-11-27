NPM_MOD_DIR := $(CURDIR)/node_modules
NPM_BIN_DIR := $(NPM_MOD_DIR)/.bin

.PHONY: xpi install_dependency lint format update_extlib install_extlib

all: xpi

install_dependency:
	[ -e "$(NPM_BIN_DIR)/eslint" -a -e "$(NPM_BIN_DIR)/jsonlint-cli" ] || npm install

lint: install_dependency
	"$(NPM_BIN_DIR)/eslint" . --ext=.js --report-unused-disable-directives
	find . -type d -name node_modules -prune -o -type f -name '*.json' -print | xargs "$(NPM_BIN_DIR)/jsonlint-cli"

format: install_dependency
	"$(NPM_BIN_DIR)/eslint" . --ext=.js --report-unused-disable-directives --fix

xpi: update_extlib install_extlib lint
	rm -f ./*.xpi
	zip -r -9 textlink-we.xpi manifest.json _locales common content_scripts options background resources extlib -x '*/.*' >/dev/null 2>/dev/null

update_extlib:
	git submodule update --init

install_extlib:
	cp ../submodules/webextensions-lib-configs/Configs.js extlib/
	cp ../submodules/webextensions-lib-options/Options.js extlib/
	cp ../submodules/webextensions-lib-l10n/l10n.js extlib/

