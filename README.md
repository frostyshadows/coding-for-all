### Contributing
If you'd like to add new articles, we would love to accept pull requests!
To make this easier, we've provided a Python 3 script, link-to-json.py.

First, fork [this repo](https://github.com/frostyshadows/coding-for-all) on Github.
Then clone your fork to your local machine:
```bash
git clone https://github.com/USERNAME/coding-for-all.git 
./link-to-json.py
```
where USERNAME is your Github username.
Follow the instructions given by link-to-json.py;
this will add your new link(s) and push it to a new branch on your Github repo.
Note that for the time being you cannot add new categories.

Then go back to your repo on Github
and make a new pull request into the master branch of frostyshadows' repo.

Thanks!

### Using the bot

Coding For All is a messenger bot that can send you Computer Science resources catered to your interests and experience level.
To chat with the bot, go to its [Facebook page](https://www.facebook.com/codingforeveryone/), click the `Send message` button, and say hi!

### Logging

If you want logs from `debug`,
you have to have the `DEBUG` environment variable set appropriately;
I like to use `DEBUG=*` to just get everything (including from Express!)
but you can also set e.g. `DEBUG=codingforall::*` to only get our own.
