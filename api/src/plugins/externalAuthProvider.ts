import { makeExtendSchemaPlugin, gql } from "graphile-utils";
import passport from "passport";
import OAuth2Strategy, {
  VerifyCallback as OAuth2VerifyCallback,
  StrategyOptions as OAuth2StrategyOptions,
} from "passport-oauth2";
import express from "express";
import config from "../config";
import { Pool } from "pg";

const authUrlBase = "/auth/";

type Provider = {
  name: string;
  settings: OAuth2StrategyOptions;
};
const providers: Provider[] = [];

if (config.externalAuth.oauth2.authorizationURL) {
  providers.push({
    name: "oauth2",
    settings: {
      authorizationURL: config.externalAuth.oauth2.authorizationURL,
      tokenURL: config.externalAuth.oauth2.tokenURL,
      clientID: config.externalAuth.oauth2.clientID,
      clientSecret: config.externalAuth.oauth2.clientSecret,
    },
  });
}

// Register providers with passport.
function registerProviders(pool: Pool): void {
  providers.forEach((provider) => {
    switch (provider.name) {
      case "oauth2": {
        const ssl = config.pad.useSSL === "false" ? "" : "s";
        provider.settings.callbackURL = `http${ssl}://${config.pad.domain}${authUrlBase}${provider.name}/callback`;
        passport.use(
          provider.name,
          new OAuth2Strategy(provider.settings, function (
            accessToken: string,
            refreshToken: string,
            profile: any,
            verified: OAuth2VerifyCallback
          ) {
            if (!("username" in profile)) {
              return verified(new Error("Missing username."));
            }
            createOrFindUser(pool, profile.username, verified);
            // TODO: Set user information.
          })
        );
        break;
      }
      default:
        console.error("Unsupported passport strategy:", provider.name);
    }
  });
}

function createOrFindUser(
  pool: Pool,
  name: string,
  verified: (err?: Error | null) => void
): void {
  pool.query("CALL ctfnote.login_external($1);", [name], (err) => {
    if (err) {
      return verified(err);
    }
    return verified();
  });
}

export function installExternalAuth(app: express.Express, pool: Pool): void {
  registerProviders(pool);

  // Setup passport routes.
  providers.forEach((provider) => {
    const auth_url = authUrlBase + provider.name;
    app.get(auth_url, passport.authenticate(provider.name));

    const callback_url = auth_url + "/callback";
    app.get(
      callback_url,
      passport.authenticate(provider.name, { failureRedirect: "/#/auth/login" }),
      function (req, res) {
        // Successful authentication, redirect home.
        res.redirect("/");
      }
    );
  });
}

export const externalAuthProviderPlugin = makeExtendSchemaPlugin(() => {
  return {
    typeDefs: gql`
      type ExternalAuthProvider {
        name: String!
        authUrl: String!
      }

      extend type Query {
        authProviders: [ExternalAuthProvider!]!
      }
    `,
    resolvers: {
      Query: {
        authProviders: async (parent, args, context, resolveInfo) => {
          return providers.map((p) => ({
            name: p.name,
            authUrl: authUrlBase + p.name,
          }));
        },
      },
    },
  };
});
