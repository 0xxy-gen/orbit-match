# OrbitMatch

Front-end pages for a launch marketplace that matches satellite operators
needing a launch with providers selling one. **There is no backend**: no server
code, no database, no accounts. The forms validate in the browser and show what
would come next, and nothing is stored or sent anywhere.

## Run it

```
npm start          # http://localhost:3200
```

That serves the `public/` folder with Python's built-in static file server —
any static server does the same job, and opening `public/signup.html` in a
browser works too.

## Pages

| Page | File | What it does |
| --- | --- | --- |
| Sign up | `public/signup.html` | Three sections — personal, company, log in — then a summary of what was entered |
| Log in | `public/login.html` | Work email and password, with Show/Hide and a link to the forgot page |
| Forgot password | `public/forgot.html` | Takes an email, then says password reset is not connected |
| Privacy Policy | `public/privacy.html` | The Aether Space policy, with a sticky contents rail and print styles |

Each success screen says plainly that it is a prototype, so nobody mistakes it
for a real account.

## How it fits together

- `public/options.js` — the choice lists (company sizes, need/sell, satellites
  per year). The forms build their fields from it.
- `public/validate.js` — the form rules, keyed by input name so each message
  lands under its field. Front end only, so it is a helpful hint, never a
  security boundary.
- `public/app.css` — one stylesheet for every page: black, Inter, underline
  inputs, cyan for action and state.

## Wiring it to a server later

Three places expect a real backend, and each says so in a comment:

- `signup.js` → `showSuccess()` replaces a POST that would create the account
- `login.js` → `showSignedIn()` replaces a POST that would start a session
- `forgot.js` → `showPending()` replaces a POST that would email a reset link
