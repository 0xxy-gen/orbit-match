# OrbitMatch

A marketplace matching satellite operators that need a launch with providers
that sell one.

## Run it

```
npm install
npm start          # http://localhost:3200   (npm run dev to watch)
```

Requires Node 22.13+. The only dependency is Express; accounts are stored in
SQLite via Node's built-in `node:sqlite` at `data/orbitmatch.db`, and passwords
are hashed with scrypt from `node:crypto`. Set `PORT` to use another port.

## Pages

**Sign up** (`/signup`), in three sections:

1. **Personal info**: first name, last name, work email, business phone,
   agreement to the Privacy Policy
2. **Company info**: company name, company size, role, whether they need a
   launch or sell launches, satellites launched per year
3. **Log in info**: password (at least 8 characters) and confirm password

The choice lists live in `public/options.js`, which the browser uses to build
the form and the server uses to validate it.

## API

| Method | Path          | Purpose                                                        |
| ------ | ------------- | -------------------------------------------------------------- |
| POST   | `/api/signup` | Create an account. Errors return `{ fields: { name: message } }` keyed by input name |
