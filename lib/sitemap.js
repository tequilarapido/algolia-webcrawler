/**
 * Parse sitemaps
 */

'use strict';

const _ = require('lodash');
const URL = require('url');
const http = require('http');
const https = require('https');
const cheerio = require('cheerio');

module.exports = (config, cb) => {
	_.each(config.sitemaps, (sitemap) => {
		const urls = [];
		const parsedUrl = URL.parse(sitemap.url);
		const httpOptions = {
			hostname: parsedUrl.hostname,
			port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
			path: parsedUrl.path,
			method: 'GET',
			auth: config.http && config.http.auth,
			headers: config.http && config.http.headers
		};
		const client = parsedUrl.protocol === 'https:' ? https : http;

		const req = client.request(httpOptions, (res) => {
			let data = '';

			res.setEncoding('utf8');

			if (res.statusCode !== 200) {
				console.error('Status code returned ' + res.statusCode);
				cb(sitemap, urls);
				return;
			}

			res.on('data', (chunk) => {
				data += chunk;
			});

			res.on('end', (chunk, encoding) => {
				if (!!chunk) {
					data += chunk;
				}

				try {
					const $ = cheerio.load(data);

                    _.each($('url'), (url) => {
						//console.log(loc.children);
                        const loc = url.children.find(child => child.name === 'loc');
                        const lastmod = url.children.find(child => child.name === 'lastmod');
                        const postType = url.children.find(child => child.name === 'posttype');
						if (!!loc.children.length > 0) {
							let action;

							if (loc.attribs['action']) {
								action = loc.attribs['action'];
							}

							urls.push({
								url: loc.children[0].data,
								lastmod: lastmod.children[0].data,
								posttype: postType.children[0].data,
								lang: sitemap.lang,
								action: action
							});
						} else {
							console.error('No url found for ' + loc);
						}
					});

				} catch (ex) {
					console.error(ex.message);
					console.log(ex.stack);
				} finally {
					cb(sitemap, urls);
				}
			});
		});

		req.on('error', (e) => {
			console.error(e.message);
			cb(sitemap, urls);
		});

		req.end();
	});
};
