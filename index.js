"use latest";

const request = require('request');

class GithubApi {

    constructor(options) {
        this.hostName = options.hostName;
        this.token = options.token;
    }

    /**
     * Add a label to a github issue or pull request
     * @param {string} owner - The owner of the github repository.
     * @param {string} repository - The name of the github repository.
     * @param {number} issueNumber - The issue or pull request number.
     * @param {string[]} labels - An array of label names to add to to issue or pull request.
     * @returns {Promise}
     */
    addLabel({ owner, repository, issueNumber, labels }) {
        return this._httpRequest({
            path: `/repos/${owner}/${repository}/issues/${issueNumber}/labels`,
            method: 'POST'
        }, labels);
    }

    /**
     * Retrieve information regarding a pull request from github
     * @param {string} owner - The owner of the github repository.
     * @param {string} repository - The name of the github repository.
     * @param {number} prNumber - The pull request number.
     * @returns {Promise}
     */
    getPullRequest({ owner, repository, prNumber }) {
        return this._httpRequest({
            path: `/repos/${owner}/${repository}/pulls/${prNumber}`,
            method: 'GET'
        }).then(response => {
            return {
                title: response.title,
                userName: response.user.login,
            };
        });
    }

    /**
     * Add a comment to a github issue or pull request
     * @param {string} owner - The owner of the github repository.
     * @param {string} repository - The name of the github repository.
     * @param {number} issueNumber - The issue or pull request number.
     * @param {string} comment - The comment to add.
     * @returns {Promise}
     */
    createComment({ owner, repository, issueNumber, comment }) {
        return this._httpRequest({
            path: `/repos/${owner}/${repository}/issues/${issueNumber}/comments`,
            method: 'POST'
        }, { "body": comment });
    }

    /**
     * Private helper method to handle HTTP
     */
    _httpRequest(options, data) {
        const postData = data ? JSON.stringify(data) : null;
        const opts = Object.assign({}, {
            url: this.hostName + options.path,
            body: postData,
            headers: {
                'Authorization': `token ${this.token}`,
                'User-Agent': 'webtask-hack',
                'Content-Type': 'application/json'
            }
        }, options);

        return new Promise((resolve, reject) => {
            request(opts, (error, response, body) => {
                if (!error && response && `${response.statusCode}`.match(/^2/)) {
                    resolve(body ? JSON.parse(body) : null);
                } else {
                    reject(error || response);
                }
            });
        });
    }
}

class PullRequestParser {

    /**
     * Parses a pull request title to their corresponding type and feature.
     * @param {string} title - The title to parse.
     * @returns {{ type: string, feature: string }}
     */
    static parseTitle(title) {
        const types = ['chore', 'fix', 'feature'];
        const regex = new RegExp("(" + types.join('|') + ")\\((.+)\\)\\:");
        const prInfo = title.match(regex);

        return prInfo ? {
            type: prInfo[1],
            feature: prInfo[2]
        } : null;
    }

    /**
     * Parses a pull request url to their corresponding owner, repository and prNumber.
     * @param {string} url - The url to parse.
     * @returns {{ owner: string, repository: string, prNumber: number }}
     */
    static parseUrl(url) {
        const regex = /^https:\/\/github.com\/(.+)\/(.+)\/pull\/(\d+)/;
        const urlParts = url.match(regex);
        return urlParts ? {
            owner: urlParts[1],
            repository: urlParts[2],
            prNumber: urlParts[3]
        } : null;
    }
}

/**
 * Update a pull request by assigning the correct labels based on the PR's title
 * @param {GithubApi} ghApi - The GithubApi instance to use.
 * @param {{ title: string, userName: string }} pr - Metadata for the pull request.
 * @param {string} owner - The owner of the github repository.
 * @param {string} repository - The name of the github repository.
 * @param {number} prNumber - The pull request number.
 * @returns {Promise}
 */
const updatePullRequest = ({ ghApi, pr, owner, repository, prNumber }) => {
    return new Promise((resolve, reject) => {
        const comment = `Hi @${pr.userName},
            Thanks for creating a pull request. We'll review this PR as soon as possible, please be patient.
            Remember that PR's are reserved for issues and feature requests only.`;

        const prInfo = PullRequestParser.parseTitle(pr.title);
        const labels = prInfo ? [
            `type: ${prInfo.type}`,
            `feature: ${prInfo.feature}`,
            `Review PR`
        ] : null;

        if (labels) {
            // Only add labels and comment when PR followed the contribution guidelines
            Promise.all([
                ghApi.addLabel({ owner, repository, issueNumber: prNumber, labels }), 
                ghApi.createComment({ owner, repository, issueNumber: prNumber, comment })
            ]).then(() => { 
                resolve('The PR was successfully updated!');
            }, () => {
                reject('Oops, something went wrong :(');
            });
        } else {
            reject('The provided PR did not follow the contribution guidelines, no action was taken!');
        }
    });
}

const webTaskHandler = (ctx, done) => {
    const githubToken = ctx.data.githubToken;
    const url = ctx.data.pullRequestUrl || '';
    const urlParts = PullRequestParser.parseUrl(url.trim());

    if (urlParts) {
        const owner = urlParts.owner;
        const repository = urlParts.repository;
        const prNumber = urlParts.prNumber;

        const ghApi = new GithubApi({
            token: githubToken,
            hostName: 'https://api.github.com'
        });

        ghApi.getPullRequest({ owner, repository, prNumber }).then((pr) => {
            updatePullRequest({
                owner,
                repository,
                prNumber,
                ghApi,
                pr
            }).then(result => done(null, result), result => done(null, result))
        }, (e) => {
            done(null, `The provided url (${url}) is invalid.`);
        });
    } else {
        done(null, `The provided url (${url}) is invalid.`);
    }
};

module.exports = (ctx, done) => {
    // Wrap webTaskHandler to log the result before calling `done` to debug in `WebTask Editor`
    webTaskHandler(ctx, (a, b) => {
        console.log(b);
        done(a, b);
    });
};
