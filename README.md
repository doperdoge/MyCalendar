# My Calendar

The simple way to sync your SJSU classes to Google Calendar. This extension simply
reads what classes you have by using [SJSU's MyScheduler](https://sjsu.collegescheduler.com/entry)
and sends them to your Google Calendar. Because of this, it requires you to be logged in to SJSU's MyScheduler.

## Quick Start

The extension works on Chrome and Firefox. To get started, follow these steps:

### Chrome:

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Open Chrome and navigate to `chrome://extensions/`, enable "Developer mode", and load the unpacked extension from the `dist` directory.

4. Build for production:

```bash
npm run build
```

Then, the release folder will contain a zip file of the extension that
you can distribute to users.

### Firefox:

Firefox has no support for HMR. This means that any changes to the extension will require a rebuild and a restart of the extension.

The first time you build the extension, you will need to install the dependencies.

```sh
npm install
```

Then, every time you want to edit the extension, you will need to:

1. Build the extension

```sh
npm run build-firefox
```

2. Load the extension:

If the extension is already loaded, you should remove it by going to `about:addons`, looking for the `MyCalendar` extension, clicking the three dots, and pressing `Remove`.

Then, load the extension by going to `about:debugging#/runtime/this-firefox` and clicking `Load Temporary Add-on`. Select the
zip file from the `release` folder.

## Project Structure

- `src/popup/` - Extension popup UI
- `src/background/` - Background scripts
- `manifest.config.ts` - Chrome extension manifest configuration

## Documentation

- [React Documentation](https://reactjs.org/)
- [Vite Documentation](https://vitejs.dev/)
- [CRXJS Documentation](https://crxjs.dev/vite-plugin)

## Chrome Extension Development Notes

- Use `manifest.config.ts` to configure your extension
- The CRXJS plugin automatically handles manifest generation
- Content scripts should be placed in `src/content/`
- Popup UI should be placed in `src/popup/`

## To Do

- Make the flow more intuitive; users may not know to re-open the popup after connecting their Google account.
