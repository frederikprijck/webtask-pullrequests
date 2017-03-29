# Auth0 WebTask

A sample project using WebTask.io in combination with GitHub pull requests.

When maintaining an open source library, Pull Requests management can get chaotic as more PR's get dropped in.
I've always liked tools such as `coveralls` and `Angular's CLA agreement` which inspect a newly created PR and/or it's author. For this project I decided to create a solution that allows for a quicker processing of newly created PR's which follow the project's contribution guidelines (e.g. `fix(docs): update docs according to new release`) by automaticly assigning labels based on the following rules:

- A PR title has to follow the structure: `[type]([feature]): [message]`
- **Type** can be either  `chore`, `fix` or `feature`.
- **Feature** is currently set to allow any value (not blank).
- **Message** is ignored.

If the above rules where satisfied, corresponding labels will be added (`type: [type]`, `feature: [feature]` and `Review Me`) and a comment is created mentioning the PR author. If not, the PR will not be processed at all.

# Testing the set up
## Live
I've created a public repository which you can use to test the integreation, feel free to create several PR's at https://github.com/frederikprijck/test. Labels and comments should be added automaticly (tho it can take a while before IFTTT picks it up).

## Deploy your own version
I understand that, for testing purposes, you prefer to deploy the webtask your self.
As the webtask makes use of a githubToken, ensure to pass it to `wt create` using `--secret githubToken={TOKEN}`.

A GitHub token can be obtained by going to https://github.com/settings/tokens and generate a new token.
Ensure to select the `public_repo` scope (unless you're not going to test using a public repository).

I've added `wt-cli` as a local dependency so ensure to do `npm install` if you do not have `wt` installed globally. You can use `npm run deploy` to deploy (ensure to update the `package.json` to include your github token).

The FTTT part only requires a GitHub Pull Request trigger and a Maker action pointing to your endpoint. The endpoint expects a `pullRequestUrl` parameter, so make sure to provide it when configuring maker (`?pullRequestUrl={{PullRequestURL}}`).



