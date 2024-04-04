# Shardeum Explorer

Shardeum Explorer serves as a comprehensive Data Collector, Indexer, and API Server for the Shardeum Network. It operates by collecting data from the archiver server, indexing it for efficient search capabilities, and providing APIs and a Web Interface for easy access to this information.

## Server Components
Shardeum Explorer consists of four different servers:

- [Collector](./src/collector.ts): Responsible for gathering data from the archiver server.
- [API and UI Server](./src/server.ts): Provides APIs and a User Interface for accessing indexed data.
- RPC Data Collector: Collects data through Remote Procedure Calls (RPC).
- [Data Stats Aggregator](./src/aggregator.ts): Aggregates statistical data for analysis and reporting.

The Explorer server uses Fastify.js for its backend implementation, while the User Interface is developed using NextJS. For data storage, we are using `sqlite` for now. 

> The default port for Shardeum Explorer is set to `6001`.

## How to start Shardeum Explorer

1. Install dependencies:

```bash
npm install
```

> Add `archiver` info and `rpc` server info in the `src/config/index.ts`, the latest archiver public key can be found on archiver_ip/archivers, ie http://45.56.123.96:4000/archivers for 1.9.0

2. Compile the update:

```bash
npm run prepare
```

3. Start the data collector server:

```bash
npm run collector << OR >> pm2 start --name explorer-collector  npm -- run collector
```

4. Start the API and UI server. This can be run in multiple instances:

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

- Usage endpoints require a security key (default: *ceba96f6eafd2ea59e68a0b0d754a939*) this should be a secret key in the production servers provided by the env var **USAGE_ENDPOINTS_KEY**
   - The security key can be used in the x-usage-key HTTP header in the related requests, incorrect or invalid keys will result in a 403 error
- The usage endpoints are:
    - POST *<host:port>/usage/enable*       **Enable the usage and start saving usage data**
    - POST *<host:port>/usage/disable*      **Disable the usage and reset usage data**
    - GET *<host:port>/usage/metrics*       **Provide usage data in the JSON format**

# Contributing

Contributions to Shardeum Explorer are highly encouraged! We welcome everyone to participate in our codebases, issue trackers, and any other form of communication. However, we expect all contributors to adhere to our [code of conduct](./CODE_OF_CONDUCT.md) to ensure a positive and collaborative environment for all involved in the project.
