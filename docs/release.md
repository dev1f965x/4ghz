# Releasing

1. Bump the version in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`,
   and merge that to `main`.
2. Tag the merge commit and push the tag:

   ```sh
   git tag -a v1.1.0 -m "4GHz 1.1.0"
   git push origin v1.1.0
   ```

3. The Release workflow builds the installer, signs it, and opens a **draft** release with
   `4GHz_x.y.z_x64-setup.exe`, its `.sig`, and `latest.json`.
4. Read the draft, then publish it. Installed copies pick it up within six hours, or on
   their next launch.

A draft is invisible to installed apps: they read
`https://github.com/dev1f965x/4ghz/releases/latest/download/latest.json`, which only
resolves to a published release.

## Signing

Update packages are signed with a minisign key pair made by `tauri signer generate`. The
public half is in `tauri.conf.json` under `plugins.updater.pubkey`; the app refuses any
update whose signature does not match it.

The private half and its password are repository secrets,
`TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, and the maintainer
keeps the originals offline. Secrets cannot be read back out of GitHub, so the offline
copy is the only one.

Losing the private key means installed copies can never be updated again: a new key
needs a new public key in the app, and the old apps only trust the old one. Everyone
would have to reinstall by hand.

Local builds do not sign. Signing is switched on only for releases, through
`src-tauri/tauri.release.conf.json`.
