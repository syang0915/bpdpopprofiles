# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

# Flask setup 

Create python venv inside api folder (cd api first)

```python -m venv venv```

for windows powershell 

```venv\Scripts\activate``

for bash and zsh 
```source venv/bin/activate```

install the following deps 
``` pip install flask python-dotenv``


in package.json, 

if you are on mac 
``` api: "cd api && venv/bin/flask run --no-debugger"```

if you are windows 
``` api: "cd api && venv\\Scripts\\flask.exe run --no-debugger"```

then rename `.env_example` to `.env` and fill in the env variables 