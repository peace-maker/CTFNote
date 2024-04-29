ALTER TABLE ctfnote_private."user"
  ADD IF NOT EXISTS external_auth boolean DEFAULT FALSE;

ALTER TABLE settings
  ADD IF NOT EXISTS registration_external_allowed boolean DEFAULT FALSE;

ALTER TABLE settings
  ADD IF NOT EXISTS login_external_allowed boolean DEFAULT FALSE;

ALTER TABLE settings
  ADD IF NOT EXISTS registration_external_default_role role DEFAULT 'user_guest'::role;

GRANT SELECT (unique_id, registration_allowed, registration_password_allowed, style, registration_external_allowed, login_external_allowed) ON ctfnote.settings TO user_anonymous;

DROP FUNCTION ctfnote_private.do_register(text, text, ctfnote.role);
CREATE FUNCTION ctfnote_private.do_register ("login" text, "password" text, "role" ctfnote.role, "external_auth" boolean DEFAULT FALSE)
  RETURNS ctfnote.jwt
  AS $$
DECLARE
  new_user ctfnote_private.user;
BEGIN
  INSERT INTO ctfnote_private.user ("login", "password", "role", "external_auth")
    VALUES (do_register.login, crypt(do_register.password, gen_salt('bf')), do_register.role, do_register.external_auth)
  RETURNING
    * INTO new_user;
  INSERT INTO ctfnote.profile ("id", "username")
    VALUES (new_user.id, login);
  RETURN (ctfnote_private.new_token (new_user.id))::ctfnote.jwt;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Username already taken';
END;

$$
LANGUAGE plpgsql
STRICT
SECURITY DEFINER;


CREATE FUNCTION ctfnote.register_external ()
  RETURNS ctfnote.jwt
  AS $$
DECLARE
  settings ctfnote.settings;
  username text;
BEGIN
  SELECT
    * INTO settings
  FROM
    ctfnote.settings
  LIMIT 1;
  IF NOT settings.registration_external_allowed THEN
    RAISE EXCEPTION 'External registration disabled';
  END IF;

  SELECT current_setting('passport.username', TRUE)::text INTO username;
  IF username IS NULL THEN
    RAISE EXCEPTION 'External auth failed';
  END IF;

  RETURN ctfnote_private.do_register (username, 'no_password', settings.registration_default_role, TRUE);
END
$$
LANGUAGE plpgsql
STRICT
SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION ctfnote.register_external () TO user_anonymous;


CREATE FUNCTION ctfnote.login_external()
  RETURNS ctfnote.jwt
  AS $$
DECLARE
  settings ctfnote.settings;
  username text;
  log_user ctfnote_private.user;
BEGIN
  SELECT
    * INTO settings
  FROM
    ctfnote.settings
  LIMIT 1;
  IF NOT settings.login_external_allowed THEN
    RAISE EXCEPTION 'External login disabled';
  END IF;

  SELECT current_setting('passport.username', TRUE)::text INTO username;
  IF username IS NULL THEN
    RAISE EXCEPTION 'External auth failed';
  END IF;

  SELECT
    * INTO log_user
  FROM
    ctfnote_private.user
  WHERE
    "user"."login" = username;
  IF NOT log_user."external_auth" THEN
    RAISE EXCEPTION 'External auth not enabled for this user';
  END IF;

  RETURN (ctfnote_private.new_token (log_user.id))::ctfnote.jwt;
END
$$
LANGUAGE plpgsql
STRICT
SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION ctfnote.login_external () TO user_anonymous;


CREATE OR REPLACE FUNCTION ctfnote.login ("login" text, "password" text)
  RETURNS ctfnote.jwt
  AS $$
DECLARE
  log_user ctfnote_private.user;
BEGIN
  SELECT
    * INTO log_user
  FROM
    ctfnote_private.user
  WHERE
    "user"."login" = "login"."login";
  IF log_user."external_auth" THEN
    RAISE EXCEPTION 'External auth required for this user';
  END IF;
  IF log_user."password" = crypt("login"."password", log_user."password") THEN
    RETURN (ctfnote_private.new_token (log_user.id))::ctfnote.jwt;
  ELSE
    RAISE EXCEPTION 'Invalid username or password';
  END IF;
END
$$
LANGUAGE plpgsql
STRICT
SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION ctfnote.login (text, text) TO user_anonymous;

-- Frontend
ALTER TYPE ctfnote.user_response ADD ATTRIBUTE external_auth boolean;

CREATE OR REPLACE VIEW ctfnote.users AS
SELECT
  cast("ctfnote"."profile".* as ctfnote.profile),
  "ctfnote_private"."user"."login",
  "ctfnote_private"."user"."role",
  "ctfnote"."profile"."id" as id,
  CONCAT('user-', "ctfnote"."profile"."id") as node_id,
  "ctfnote_private"."user"."external_auth"
FROM
  "ctfnote"."profile"
  INNER JOIN "ctfnote_private"."user" ON "ctfnote_private"."user"."id" = "ctfnote"."profile"."id"
ORDER BY id;

GRANT SELECT ON ctfnote.users TO user_admin;