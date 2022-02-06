#!/bin/bash

# If working from a bare source checkout, rebuild some things so that the site loads properly
if [ ! -d /unowallet/build ]; then
    cd /unowallet/src; bower --allow-root --config.interactive=false update
    cd /unowallet; npm update
    npm run prepublish
    npm run build
    #grunt build --dontcheckdeps
fi
if [ ! -f /unowallet/unowallet.conf.json ]; then
    cp -a /unowallet/unowallet.conf.json.example /unowallet/unowallet.conf.json
fi
if [ ! -f /ssl_config/unowallet.pem ]; then
    cp -a /etc/ssl/certs/ssl-cert-snakeoil.pem /ssl_config/unowallet.pem
fi
if [ ! -f /ssl_config/unowallet.key ]; then
    cp -a /etc/ssl/private/ssl-cert-snakeoil.key /ssl_config/unowallet.key
fi

# Specify defaults (defaults are overridden if defined in the environment)
export REDIS_HOST=${REDIS_HOST:="redis"}
export REDIS_PORT=${REDIS_PORT:=6379}
export REDIS_DB=${REDIS_DB:=0}
export UNOBLOCK_HOST_MAINNET=${UNOBLOCK_HOST_MAINNET:="unoblock"}
export UNOBLOCK_HOST_TESTNET=${UNOBLOCK_HOST_TESTNET:="unoblock-testnet"}
export UNOBLOCK_PORT_MAINNET=${UNOBLOCK_PORT_MAINNET:=4120}
export UNOBLOCK_PORT_TESTNET=${UNOBLOCK_PORT_TESTNET:=14120}
export UNOBLOCK_PORT_MAINNET_FEED=${UNOBLOCK_PORT_MAINNET_FEED:=4121}
export UNOBLOCK_PORT_TESTNET_FEED=${UNOBLOCK_PORT_TESTNET_FEED:=14121}
export UNOBLOCK_PORT_MAINNET_CHAT=${UNOBLOCK_PORT_MAINNET_CHAT:=4122}
export UNOBLOCK_PORT_TESTNET_CHAT=${UNOBLOCK_PORT_TESTNET_CHAT:=14122}

VARS='$REDIS_HOST:$REDIS_PORT:$REDIS_DB:$UNOBLOCK_HOST_MAINNET:$UNOBLOCK_HOST_TESTNET:$UNOBLOCK_PORT_MAINNET:$UNOBLOCK_PORT_TESTNET:$UNOBLOCK_PORT_MAINNET_FEED:$UNOBLOCK_PORT_TESTNET_FEED:$UNOBLOCK_PORT_MAINNET_CHAT:$UNOBLOCK_PORT_TESTNET_CHAT'
envsubst "$VARS" < /unowallet/docker/nginx/unowallet.conf.template > /etc/nginx/sites-enabled/unowallet.conf

# Launch utilizing the SIGTERM/SIGINT propagation pattern from
# http://veithen.github.io/2014/11/16/sigterm-propagation.html
trap 'kill -TERM $PID' TERM INT
nginx -g 'daemon off;' &
# ^ maybe simplify to just be "nginx" in the future
PID=$!
wait $PID
trap - TERM INT
wait $PID
EXIT_STATUS=$?
