# Shardeum Explorer

Shardeum Explorer serves as a comprehensive Data Collector, Indexer, and API Server for the Shardeum Network. It operates by collecting data from the distributor, indexing it for efficient search capabilities, and providing APIs and a Web Interface for easy access to this information.

## Server Components

Shardeum Explorer consists of three componenets:

- [Collector](./src/collector.ts): Responsible for gathering data from the distributor.
- [API and UI Server](./src/server.ts): Provides APIs and a User Interface for accessing indexed data.
- [Data Stats Aggregator](./src/aggregator.ts): Aggregates statistical data for analysis and reporting.

The Explorer server uses Fastify.js for its backend implementation, while the User Interface is developed using NextJS. For data storage, we are using `sqlite`.

## Requirements

> Before starting the explorer, be sure that the distributor and rpc services are up and running. Shardeum Explorer uses the distributor to collect data and the rpc service to decode the contract information.

If you are running a local Shardeum Network, you can start the distributor and rpc services with the following repos:

- Distributor Repo: https://gitlab.com/shardus/relayer/distributor
- RPC Repo: https://gitlab.com/shardeum/json-rpc-server

## How to start Shardeum Explorer

1. Install dependencies:

```bash
npm install
```

> Update the `distributorInfo`, `collectorInfo` and `rpcUrl` info in the `src/config/index.ts` file. If you're testing for a local network, you can use the default values. If you're starting for a testnet or prod network, update the values accordingly. (Be sure that your collectorInfo is in the subscriber list of the distributor.)

2. Compile the update:

```bash
npm run prepare
```

3. Start the data collector server:

```bash
npm run collector << OR >> pm2 start --name explorer-collector  npm -- run collector
```

4. Start the API and UI server. The default port of the server is `6001`. We can change the port by providing the port number as an argument. We can start multiple instances of the server by providing different port numbers.

```bash
npm run server << OR >> pm2 start --name explorer-server npm -- run server <port>
```

5. View the explorer in the web

```bash
http://localhost:6001 <<OR>> http://localhost:<port>
```

6. Start the data stats aggregator server

```bash
npm run aggregator << OR >> pm2 start --name explorer-aggregator npm -- run aggregator
```

To clean the old database, use:

```bash
npm run flush
```

## Usage endpoints

Usage endpoints are provided to track and manage usage statistics for each endpoint in the explorer server API. Key points regarding usage endpoints:

- Usage endpoints require a security key (default: _ceba96f6eafd2ea59e68a0b0d754a939_) this should be a secret key in the production servers provided by the env var **USAGE_ENDPOINTS_KEY**
  - The security key can be used in the x-usage-key HTTP header in the related requests, incorrect or invalid keys will result in a 403 error
- The usage endpoints are:
  - POST _<host:port>/usage/enable_ **Enable the usage and start saving usage data**
  - POST _<host:port>/usage/disable_ **Disable the usage and reset usage data**
  - GET _<host:port>/usage/metrics_ **Provide usage data in the JSON format**
  
## Health Check

GET `/is-alive` this endpoint returns 200 if the server is running.
GET `/is-healthy` currently the same as `/is-alive` but will be expanded

# Contributing

Contributions to Shardeum Explorer are highly encouraged! We welcome everyone to participate in our codebases, issue trackers, and any other form of communication. However, we expect all contributors to adhere to our [code of conduct](./CODE_OF_CONDUCT.md) to ensure a positive and collaborative environment for all involved in the project.
