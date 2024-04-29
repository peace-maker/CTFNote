<template>
  <q-card>
    <q-form @submit="submit">
      <q-card-section>
        <div class="text-h5">Register</div>
      </q-card-section>

      <q-card-section class="q-pt-none q-pb-sm q-gutter-sm">
        <template v-if="registrationAnyAllowed">
          <q-input
            v-model="form.login"
            filled
            dense
            label="Username"
            required
          />
          <password-input
            v-model="form.password"
            label="Password"
            dense
            clearable
            required
          />
          <q-input
            v-if="!!token"
            filled
            dense
            readonly
            :model-value="token"
            label="Auth token"
            class="q-pt-sm"
          >
            <template #prepend>
              <q-icon name="key" />
            </template>
          </q-input>
          <template v-else>
            <q-checkbox
              v-if="registrationPasswordForced"
              :model-value="true"
              disable
              title="A registration password is required to log on this instance."
              label="I have a registration password (required)"
            />
            <q-checkbox
              v-else-if="registrationPasswordAllowed"
              v-model="usePassword"
              label="I have a registration password"
            />
            <password-input
              v-if="
                registrationPasswordAllowed &&
                (usePassword || registrationPasswordForced)
              "
              v-model="form.registrationPassword"
              filled
              dense
              clearable
              label="Registration password"
              required
              class="q-mt-xs"
            >
              <template #prepend>
                <q-icon name="key" />
              </template>
            </password-input>
          </template>
        </template>
        <div v-else class="q-pb-sm">Registration is disabled.</div>
      </q-card-section>

      <q-card-actions v-if="registrationAnyAllowed" class="row q-px-md q-pb-md">
        <q-btn
          type="submit"
          label="Register"
          color="primary"
          class="full-width"
        />
      </q-card-actions>

      <q-card-actions
        v-if="registrationExternalAllowed && authProviders.length > 0"
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
              @click="registerUsingExternalAuth(provider.name)"
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

  <q-card class="q-mt-md">
    <q-card-actions class="row q-px-md">
      <span>Already have an account?</span>
      <q-space />
      <ctf-note-link name="auth-login">
        <q-btn flat color="primary">Login</q-btn>
      </ctf-note-link>
    </q-card-actions>
  </q-card>
</template>

<script lang="ts">
import PasswordInput from 'src/components/Utils/PasswordInput.vue';
import ctfnote from 'src/ctfnote';
import { defineComponent, reactive, ref } from 'vue';
import CtfNoteLink from '../Utils/CtfNoteLink.vue';

export default defineComponent({
  components: { PasswordInput, CtfNoteLink },
  props: {
    token: { type: String, default: '' },
  },
  setup() {
    const { result: authProviders, loading } = ctfnote.auth.getAuthProviders();
    return {
      resolveAndNotify: ctfnote.ui.useNotify().resolveAndNotify,
      register: ctfnote.auth.useRegister(),
      registerWithToken: ctfnote.auth.useRegisterWithToken(),
      registerWithPassword: ctfnote.auth.useRegisterWithPassword(),
      settings: ctfnote.settings.injectSettings(),
      form: reactive({
        login: '',
        password: '',
        registrationPassword: '',
      }),
      usePassword: ref(false),
      authProviders,
      loadingAuthProviders: loading,
    };
  },
  computed: {
    registrationAllowed() {
      return this.settings?.registrationAllowed || !!this.token;
    },
    registrationPasswordAllowed(): boolean {
      return this.settings?.registrationPasswordAllowed ?? false;
    },
    registrationExternalAllowed(): boolean {
      return this.settings?.registrationExternalAllowed ?? false;
    },
    registrationAnyAllowed() {
      return this.registrationAllowed || this.registrationPasswordAllowed;
    },
    registrationPasswordForced() {
      return !this.registrationAllowed && this.registrationPasswordAllowed;
    },
  },
  methods: {
    submit() {
      const opts = {
        message: `Logged as ${this.form.login}!`,
        icon: 'person',
      };
      let registerPromise;

      if (this.token) {
        registerPromise = this.registerWithToken(
          this.form.login,
          this.form.password,
          this.token
        );
      } else if (this.registrationPasswordForced || this.usePassword) {
        registerPromise = this.registerWithPassword(
          this.form.login,
          this.form.password,
          this.form.registrationPassword
        );
      } else {
        registerPromise = this.register(this.form.login, this.form.password);
      }

      void this.resolveAndNotify(registerPromise, opts);
    },
    registerUsingExternalAuth(provider: string) {
      ctfnote.auth.doExternalAuth(provider);
    },
  },
});
</script>

<style scoped></style>
