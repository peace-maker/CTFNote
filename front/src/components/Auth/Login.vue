<template>
  <q-card>
    <q-form @submit="submit">
      <q-card-section>
        <div class="text-h5">Login</div>
      </q-card-section>
      <q-card-section class="q-gutter-md">
        <q-input
          v-model="form.login"
          filled
          autocomplete="username"
          autocapitalize="none"
          label="Login"
          required
        />
        <password-input v-model="form.password" required />

        <q-input
          v-if="!!token"
          filled
          readonly
          :model-value="token"
          label="Token"
        />
      </q-card-section>
      <q-card-actions class="q-pa-md row justify-between">
        <div v-if="registrationEnabled">
          I don't have an account:
          <b>
            <ctf-note-link
              name="auth-register"
              class="text-primary"
              label="REGISTER"
              underline
            />
          </b>
        </div>
        <div v-else />
        <q-btn type="submit" label="Login" color="primary" />
      </q-card-actions>
      <q-card-actions
        v-if="loginExternalEnabled && authProviders.length > 0"
        class="q-pa-md row justify-between"
      >
        <q-btn-dropdown
          color="primary"
          :loading="loadingAuthProviders"
          label="External Auth"
        >
          <div>
            <q-item
              v-for="provider in authProviders"
              :key="provider.name"
              v-close-popup
              clickable
              @click="loginUsingExternalAuth(provider.name)"
            >
              <q-item-section>
                <q-item-label>{{ provider.name }}</q-item-label>
              </q-item-section>
            </q-item>
          </div>
        </q-btn-dropdown>
      </q-card-actions>
    </q-form>
  </q-card>
</template>

<script lang="ts">
import PasswordInput from 'src/components/Utils/PasswordInput.vue';
import { ctfnote } from 'src/ctfnote';
import { defineComponent, reactive } from 'vue';
import CtfNoteLink from '../Utils/CtfNoteLink.vue';

export default defineComponent({
  components: { PasswordInput, CtfNoteLink },
  props: {
    token: { type: String, default: '' },
  },
  setup() {
    const { result: authProviders, loading } = ctfnote.auth.getAuthProviders();
    return {
      settings: ctfnote.settings.injectSettings(),
      resolveAndNotify: ctfnote.ui.useNotify().resolveAndNotify,
      login: ctfnote.auth.useLogin(),
      form: reactive({
        login: '',
        password: '',
      }),
      authProviders,
      loadingAuthProviders: loading,
    };
  },
  computed: {
    registrationEnabled() {
      return (
        this.settings.registrationAllowed ||
        this.settings.registrationPasswordAllowed
      );
    },
    loginExternalEnabled() {
      return this.settings.loginExternalAllowed;
    },
  },
  methods: {
    submit() {
      const login = this.form.login;
      void this.resolveAndNotify(
        this.login(this.form.login, this.form.password),
        {
          message: `Logged as ${login}!`,
          icon: 'person',
        }
      );
    },
    loginUsingExternalAuth(provider: string) {
      ctfnote.auth.doExternalAuth(provider);
    },
  },
});
</script>

<style scoped></style>
