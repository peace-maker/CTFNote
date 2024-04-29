import simplifyPlugin from "@graphile-contrib/pg-simplify-inflector";
import PgPubsub from "@graphile/pg-pubsub";
import crypto from "crypto";
import express from "express";
import { graphqlUploadExpress } from "graphql-upload-ts";
import {
  makePluginHook,
  postgraphile,
  PostGraphileOptions,
} from "postgraphile";
import { migrate, MigrateDBConfig } from "postgres-migrations";
import config from "./config";
import createTasKPlugin from "./plugins/createTask";
import {
  externalAuthProviderPlugin,
  installExternalAuth,
} from "./plugins/externalAuthProvider";
import importCtfPlugin from "./plugins/importCtf";
import uploadLogoPlugin from "./plugins/uploadLogo";
import uploadScalar from "./plugins/uploadScalar";
import ConnectionFilterPlugin from "postgraphile-plugin-connection-filter";
import jwt from "jsonwebtoken";

function getDbUrl(role: "user" | "admin") {
  const login = config.db[role].login;
  const password = config.db[role].password;
  return `postgres://${login}:${password}@${config.db.host}:${config.db.port}/${config.db.database}`;
}

function createOptions() {
  const secret = crypto.randomBytes(32).toString("hex");

  const postgraphileOptions: PostGraphileOptions = {
    pluginHook: makePluginHook([PgPubsub]),
    subscriptions: true,
    dynamicJson: true,
    simpleSubscriptions: true,
    setofFunctionsContainNulls: false,
    ignoreRBAC: false,
    disableQueryLog: true,
    ignoreIndexes: false,
    subscriptionAuthorizationFunction: "ctfnote_private.validate_subscription",
    jwtPgTypeIdentifier: "ctfnote.jwt",
    jwtSecret: secret,
    appendPlugins: [
      simplifyPlugin,
      uploadScalar,
      importCtfPlugin,
      uploadLogoPlugin,
      createTasKPlugin,
      ConnectionFilterPlugin,
      externalAuthProviderPlugin,
    ],
    ownerConnectionString: getDbUrl("admin"),
    enableQueryBatching: true,
    legacyRelations: "omit" as const,
    pgSettings: async (req) => {
      let role = "user_anonymous";

      try {
        if (
          req.headers.authorization != null &&
          req.headers.authorization.startsWith("Bearer ")
        ) {
          const jwtStr = req.headers.authorization.substring(7);
          let claims = jwt.verify(
            jwtStr,
            config.env == "development" ? "DEV" : secret
          );

          if (claims instanceof String) {
            throw Error("Invalid token format.");
          }

          claims = claims as jwt.JwtPayload;
          if (claims.role === undefined) {
            throw Error("Role is missing.");
          }

          role = claims.role;
        }
      } catch (error) {
        console.log(error);
      }

      return { role: role };
    },
  };

  if (config.env == "development") {
    postgraphileOptions.watchPg = true;
    postgraphileOptions.disableQueryLog = false;
    postgraphileOptions.graphiql = true;
    postgraphileOptions.exportGqlSchemaPath = "schema.graphql";
    postgraphileOptions.retryOnInitFail = true;
    postgraphileOptions.enhanceGraphiql = true;
    postgraphileOptions.allowExplain = true;
    postgraphileOptions.jwtSecret = "DEV";
    postgraphileOptions.showErrorStack = "json" as const;
    postgraphileOptions.extendedErrors = ["hint", "detail", "errcode"];

    postgraphileOptions.graphileBuildOptions = {
      connectionFilterAllowedOperators: ["includesInsensitive"],
      connectionFilterAllowedFieldTypes: ["String"],
      connectionFilterComputedColumns: false,
      connectionFilterSetofFunctions: false,
      connectionFilterArrays: false,
    };
  }
  return postgraphileOptions;
}

function createApp(postgraphileOptions: PostGraphileOptions) {
  const app = express();
  app.use(graphqlUploadExpress());
  app.use(
    "/uploads",
    express.static("uploads", {
      setHeaders: function (res) {
        res.set("Content-Disposition", "attachment");
      },
    })
  );
  app.use(postgraphile(getDbUrl("user"), "ctfnote", postgraphileOptions));
  installExternalAuth(app);
  return app;
}

async function performMigrations() {
  const dbConfig: MigrateDBConfig = {
    database: config.db.database,
    user: config.db.admin.login,
    password: config.db.admin.password,
    host: config.db.host,
    port: config.db.port,
    ensureDatabaseExists: true,
    defaultDatabase: "postgres",
  };

  await migrate(dbConfig, "./migrations");
}

async function main() {
  await performMigrations();
  const postgraphileOptions = createOptions();
  const app = createApp(postgraphileOptions);
  app.listen(config.web.port, () => {
    console.log(`Listening on :${config.web.port}`);
  });
}

main();
