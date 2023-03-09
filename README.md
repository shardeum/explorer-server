# Shardeum Explorer

## Data Collector / Indexer / API Server for the Shardeum Network.

Shardeum explorer collects data from the the archiver server and indexes data and information to be searchable by different formats and exposes APIs and Web Interface.

Sharduem explorer consists of four servers.

- Collector               --> collector.ts
- API and UI server       --> server.ts
- RPC Data Collector      --> rpc_data_server.ts
- Data Stats Aggregator   --> aggregator.ts

Explorer server use Fastify.js and UI is developed using NextJS. For data storage, we are using `sqlite` for now.

Default port: 6001

### How to start Shardeum Explorer

```
npm install
```

> Add `archvier` info and `rpc` server info in the `src/config/index.ts`

```
npm run prepare // compile the update
```

Start the data collector server

```
npm run collector << OR >> pm2 start --name explorer-collector  npm -- run collector
```

Start the API and UI server. This can be run multi instances.

```
npm run server << OR >> pm2 start --name explorer-server npm -- run server <port>
```

View the explorer in the web

```
http://localhost:6001 <<OR>> http://localhost:<port>
```

Start the RPC data collector server

```
npm run rpc_data_server << OR >> pm2 start --name explorer-rpc-data-collector npm -- run rpc_data_server <port>
```

Start the data stats aggregator server

```
npm run aggregator << OR >> pm2 start --name explorer-aggregator npm -- run aggregator
```

To clean the old database.

```
npm run flush
```
