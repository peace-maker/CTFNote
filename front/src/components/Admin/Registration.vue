<template>
  <div class="row q-gutter-md">
    <div class="col">
      <q-card bordered>
        <q-card-section>
          <div class="text-h6">Registration</div>
        </q-card-section>
        <q-card-section>
          <div>
            <q-toggle
              v-model="registrationAllowed"
              left-label
              label="Allow registration on CTFNote"
            />
          </div>
        </q-card-section>
      </q-card>
    </div>
    <div class="col">
      <q-card bordered>
        <q-card-section>
          <div class="text-h6">Registration with password</div>
        </q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-toggle
            v-model="registrationPasswordAllowed"
            left-label
            label="Allow registration with password on CTFNote"
          />
          <select-role
            v-model="registrationDefaultRole"
            :disable="!registrationPasswordAllowed"
            label="Default role"
          />
          <password-input
            v-model="registrationPassword"
            :disable="!registrationPasswordAllowed"
            :filled="false"
            label="Registration password"
          >
            <template #after>
              <q-btn
                icon="save"
                round
                :color="
                  registrationPassword == adminSettings.registrationPassword
                    ? 'grey-5'
                    : 'positive'
                "
                :disabled="
                  registrationPassword == adminSettings.registrationPassword
                "
                @click="updateRegistrationPassword"
              />
            </template>
          </password-input>
        </q-card-section>
      </q-card>
    </div>
  </div>
  <div class="row q-gutter-md">
    <div class="col">
      <q-card bordered>
        <q-card-section>
          <div class="text-h6">External Authentication</div>
        </q-card-section>
        <q-card-section>
          <q-toggle
            v-model="loginExternalAllowed"
            left-label
            label="Allow login on CTFNote using external authentication provider"
          />
          <q-toggle
            v-model="registrationExternalAllowed"
            left-label
            label="Allow registration on CTFNote using external authentication provider"
          />
          <select-role
            v-model="registrationExternalDefaultRole"
            :disable="!registrationExternalAllowed"
            label="Default role"
          />
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script lang="ts">
import { Role } from 'src/ctfnote/models';
import ctfnote from 'src/ctfnote';
import { defineComponent, ref, watch } from 'vue';
import PasswordInput from '../Utils/PasswordInput.vue';
import SelectRole from '../Utils/SelectRole.vue';

export default defineComponent({
  components: { PasswordInput, SelectRole },
  setup() {
    const { result: adminSettings } = ctfnote.settings.getAdminSettings();

    const registrationPassword = ref('');

    watch(
      adminSettings,
      (s) => {
        registrationPassword.value = s.registrationPassword ?? '';
      },
      { immediate: true }
    );

    return {
      resolveAndNotify: ctfnote.ui.useNotify().resolveAndNotify,
      updateSettings: ctfnote.settings.useUpdateSettings(),
      adminSettings,
      registrationPassword,
    };
  },
  computed: {
    registrationAllowed: {
      get(): boolean {
        return this.adminSettings.registrationAllowed ?? true;
      },
      set(registrationAllowed: boolean) {
        const opts = {
          message: registrationAllowed
            ? 'Registration enabled'
            : 'Registration disabled',
          icon: 'lock',
        };

        void this.resolveAndNotify(
          this.updateSettings({ registrationAllowed }),
          opts
        );
      },
    },
    registrationPasswordAllowed: {
      get(): boolean {
        return this.adminSettings.registrationPasswordAllowed ?? true;
      },
      set(registrationPasswordAllowed: boolean) {
        const opts = {
          message: registrationPasswordAllowed
            ? 'Registration with password enabled!'
            : 'Registration with password disabled!',
          icon: 'lock',
        };

        void this.resolveAndNotify(
          this.updateSettings({ registrationPasswordAllowed }),
          opts
        );
      },
    },
    registrationDefaultRole: {
      get(): Role {
        return this.adminSettings.registrationDefaultRole ?? Role.UserGuest;
      },
      set(registrationDefaultRole: Role) {
        const roleName = registrationDefaultRole.slice(5).toLowerCase();
        const opts = {
          message: `Default role set to ${roleName}!`,
          icon: 'lock',
        };

        void this.resolveAndNotify(
          this.updateSettings({ registrationDefaultRole }),
          opts
        );
      },
    },
    registrationExternalAllowed: {
      get(): boolean {
        return this.adminSettings.registrationExternalAllowed ?? true;
      },
      set(registrationExternalAllowed: boolean) {
        const opts = {
          message: registrationExternalAllowed
            ? 'Registration using external authentication providers enabled'
            : 'Registration using external authentication providers disabled',
          icon: 'lock',
        };

        void this.resolveAndNotify(
          this.updateSettings({ registrationExternalAllowed }),
          opts
        );
      },
    },
    loginExternalAllowed: {
      get(): boolean {
        return this.adminSettings.loginExternalAllowed ?? true;
      },
      set(loginExternalAllowed: boolean) {
        const opts = {
          message: loginExternalAllowed
            ? 'Login using external authentication providers enabled'
            : 'Login using external authentication providers disabled',
          icon: 'lock',
        };

        void this.resolveAndNotify(
          this.updateSettings({ loginExternalAllowed }),
          opts
        );
      },
    },
    registrationExternalDefaultRole: {
      get(): Role {
        return (
          this.adminSettings.registrationExternalDefaultRole ?? Role.UserGuest
        );
      },
      set(registrationExternalDefaultRole: Role) {
        const roleName = registrationExternalDefaultRole.slice(5).toLowerCase();
        const opts = {
          message: `External default role set to ${roleName}!`,
          icon: 'lock',
        };

        void this.resolveAndNotify(
          this.updateSettings({ registrationExternalDefaultRole }),
          opts
        );
      },
    },
  },
  watch: {},
  methods: {
    updateRegistrationPassword() {
      const opts = {
        message: 'Registration password changed!',
        icon: 'lock',
      };

      void this.resolveAndNotify(
        this.updateSettings({
          registrationPassword: this.registrationPassword,
        }),
        opts
      );
    },
  },
});
</script>

<style scoped></style>
