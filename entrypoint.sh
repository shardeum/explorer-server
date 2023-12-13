#!/bin/bash -x

npm run build:release
npm run prepare

NO_OF_EXPLORERS=${NO_OF_EXPLORERS:-1}

case ${1} in
  "server")
    EXPLORER_PORT=6001
    for i in $(seq $NO_OF_EXPLORERS); do
      pm2 start --daemon --name explorer-server-$i npm -- run server ${EXPLORER_PORT}
      EXPLORER_PORT=$(( EXPLORER_PORT + 1 ))
    done
    ;;

  "collector" | "aggregator" | "log_server")
    pm2 start --daemon --name explorer-${1} npm -- run ${1}
    ;;
  *)
    echo "Service ${1} is not recognizable."
    exit 1
    ;;
esac

exec pm2 logs
