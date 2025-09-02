# My Calendar

The simple way to sync your SJSU classes to Google Calendar. This extension simply
reads what classes you have by using [SJSU's MyScheduler](https://sjsu.collegescheduler.com/entry)
and sends them to your Google Calendar. Because of this, it requires you to be logged in to SJSU's MyScheduler.

## Quick Start

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

## Project Structure

- `src/popup/` - Extension popup UI
- `src/content/` - Content scripts
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

1. Prevent duplicates
2. Make the flow more intuitive; users may not know to re-open the popup or to close the MyScheduler window.
