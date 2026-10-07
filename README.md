# Moodboard

Describe a mood and get a color palette and a playlist to match.

Type something like "rainy sunday, cozy, a little nostalgic" and Moodboard builds a palette, a genre and tempo direction, and a tracklist you can preview and open in Spotify, Apple Music or YouTube Music.

It is a single static page (`index.html`) plus two small serverless functions, built to deploy on Vercel.

## Features

**Ways to start**
- Type a mood
- Start from a song or artist
- Paste a journal entry, poem or chat and have the mood read from it
- Upload a photo and pull its colors and feeling
- "Right now": uses your time of day and local weather

**Palette**
- Palette built from your words, with a name for each color
- Lock colors you like and regenerate the rest
- Original, pastel, vivid, muted and dark variations
- Copy colors as hex

**Playlist**
- Choose length, era, language, and mellow/upbeat or familiar/deep-cut balance
- Songs are checked against Apple's catalog and made-up songs are flagged or replaced
- 30-second previews, play all, and an endless mode that keeps adding songs
- Swap a song, or build a new playlist around one ("more like this")
- Open any song in Spotify, Apple Music or YouTube Music
- Copy the tracklist to move it into your account with a transfer tool such as TuneMyMusic

**Extras**
- Poster, cover art and phone or desktop wallpaper generator (PNG download)
- Share link that carries the palette and tracklist
- History, favorites, blending two saved vibes, and a "your year" summary
- Lock-screen media controls, a mini player on phones, and an ambient mode that keeps the screen awake
- Light and dark themes, and a layout for both desktop and mobile

## How it works

```
index.html        the whole front end (HTML, CSS and JS in one file)
api/mood.js       POST /api/mood     sends the prompt (and photos) to Groq
api/itunes.js     GET  /api/itunes   proxies Apple's iTunes Search API
```

- `/api/mood` keeps your Groq API key on the server. It picks a suitable text or vision model from the ones your key can use, unless you set one yourself.
- `/api/itunes` is used to find 30-second previews and to verify that songs exist. Responses are cached at the edge for a day.
- Saved vibes, favorites and theme live in the browser's `localStorage`. There is no database.

## Deploy on Vercel

1. Put the files in this layout:

   ```
   index.html
   api/mood.js
   api/itunes.js
   ```

2. Push the repo to GitHub and import it in [Vercel](https://vercel.com).
3. Add an environment variable:

   | Name | Required | Description |
   | --- | --- | --- |
   | `GROQ_API_KEY` | yes | Your key from [console.groq.com](https://console.groq.com) |
   | `GROQ_TEXT_MODEL` | no | Force a specific text model |
   | `GROQ_VISION_MODEL` | no | Force a specific vision model (used for photos) |

4. Deploy.

## Run locally

```bash
npm i -g vercel
vercel dev
```

Create a `.env` file with `GROQ_API_KEY=your_key` first. Then open the URL that `vercel dev` prints. Opening `index.html` directly will not work, because the page calls `/api/...`.

## Notes

- The rate limit in `mood.js` (12 requests per minute per IP) is stored in memory per server instance, so it is only best effort. Use Upstash or Vercel KV if you need a hard limit.
- Text and photos you submit are sent to Groq to generate the result. Pasted text is not stored by this app.
- Songs are picked by an AI model, so double-check versions when you open them in your music app.
- The app cannot create playlists directly in Spotify, Apple Music or YouTube Music. That would need each service's login and developer keys.
- Share links work for other people only when the page is hosted online.

## License

Add a license of your choice, for example MIT.
