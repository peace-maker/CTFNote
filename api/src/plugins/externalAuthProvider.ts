import { makeExtendSchemaPlugin, gql } from "graphile-utils";
import passport from "passport";
import OAuth2Strategy, {
  VerifyCallback as OAuth2VerifyCallback,
} from "passport-oauth2";
import express from "express";

const authUrlBase = "/auth/";

type Provider = {
  name: string;
  settings: Record<string, string>;
};
const providers: Provider[] = [];

// TODO: Parse providers from env. Do we want to change the providers list to a map for this?
providers.push({
  name: "oauth2",
  settings: {
    authorizationURL: "https://www.example.com/oauth2/authorize",
    tokenURL: "https://www.example.com/oauth2/token",
    clientID: "5",
    clientSecret: "5",
    callbackURL: "http://localhost:3000/auth/example/callback",
  },
});

// Register providers with passport.
providers.forEach((provider) => {
  switch (provider.name) {
    case "oauth2":
      passport.use(
        provider.name,
        new OAuth2Strategy(provider.settings as any, function (
          accessToken: string,
          refreshToken: string,
          profile: any,
          verified: OAuth2VerifyCallback
        ) {
          if (!("username" in profile)) {
            return verified(new Error("Missing username."));
          }
          createOrFindUser(profile.username, verified);
          // TODO: Set user information.
        })
      );
      break;

    default:
      console.error("Unsupported passport strategy:", provider.name);
  }
});

function createOrFindUser(
  name: string,
  verified: (err?: Error | null) => void
): void {
  verified(new Error("Not implemented."));
}

export function installExternalAuth(app: express.Express): void {
  // Setup passport routes.
  providers.forEach((provider) => {
    const url = authUrlBase + provider.name;
    app.get(url, passport.authenticate(provider.name));
  });
}

export const externalAuthProviderPlugin = makeExtendSchemaPlugin((build) => {
  const { pgSql: sql, inflection } = build;

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
