### Contributing

If you'd like to add new articles,
use the link-to-json.py Python 3 script to do so.
In particular:
```bash
git clone https://github.com/frostyshadows/coding-for-all.git
cd coding-for-all/
git checkout -b USERNAME-contrib
./link-to-json.py
```
where `USERNAME` is your Github username.

The link-to-json.py script will ask you for the information it needs,
then update the links database (links.json).
After adding all the links:

```bash
git add links.json
git commit -m "New links from USERNAME"
git push --set-upstream origin USERNAME-contrib
```

Then go to [the repo on Github](https://github.com/frostyshadows/coding-for-all),
go to branches, and make a new pull request for your branch!

In the future more of this process might be automated.

### Using the bot

Coding For All is a messenger bot that can send you Computer Science resources catered to your interests and experience level.
To chat with the bot, go to its [Facebook page](https://www.facebook.com/codingforeveryone/), click the `Send message` button, and say hi!

### Logging

If you want logs from `debug`,
you have to have the `DEBUG` environment variable set appropriately;
I like to use `DEBUG=*` to just get everything (including from Express!)
but you can also set e.g. `DEBUG=codingforall::*` to only get our own.
