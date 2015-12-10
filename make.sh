#!/bin/sh

appname=textlink

cp makexpi/makexpi.sh ./
./makexpi.sh -n $appname -o
rm ./makexpi.sh

