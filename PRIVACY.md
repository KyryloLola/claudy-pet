# Claudy Pet privacy policy

Claudy Pet is a Claude Code mod that runs entirely on your machine. It has no server, no account and no analytics.

**Data it keeps.** The pet, its settings, the album of retired pets and a cached rough location are stored on your machine, in Claude Code's own store for this plugin. They are never uploaded.

**Data it sends.** Only while the weather setting is on (`/pet-weather on`, the default):

- a request to `https://ipwho.is/`, which sees your IP address and returns a rough location (city and coordinates); made at most twice a day;
- a request to `https://api.open-meteo.com/v1/forecast` with those coordinates rounded to about a kilometre; made every 20 minutes.

These services' own privacy policies apply to those requests: [ipwho.is (by ipwhois.io)](https://ipwhois.io/privacy) and [Open-Meteo](https://open-meteo.com/en/terms#privacy).

**Data it never sends.** Your prompts, conversation, tool calls, files and code are never sent anywhere. The mod reads prompts and tool calls only to count them and to tell when you are typing.

**Turning it off.** `/pet-weather off` stops all network requests. Uninstalling the plugin removes the mod; its local store can be removed with it.

Questions: open an issue at https://github.com/KyryloLola/claudy-pet/issues.
