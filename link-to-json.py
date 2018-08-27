#!/usr/bin/env python3
# small command line tool for formatting info about a link into JSON

import subprocess
import json

username = ''
while not username:
    username = input("Enter a username for attribution:\n")

branch_name = "{}-contrib".format(username)
create_branch_cmd = ['git', 'checkout', '-b', branch_name]
subprocess.check_output(create_branch_cmd)

levels_data = json.load(open('data/valid_levels.json', 'r'))
valid_levels = []
for level in levels_data:
    valid_levels.append(level['value'])
interests_data = json.load(open('data/valid_interests.json', 'r'))
valid_interests = []
for interest in interests_data:
    valid_interests.append(interest['value'])
valid_types = json.load(open('data/valid_resource_types.json', 'r'))

links_file = open("data/links.json", "r")
links = json.load(links_file)
links_file.close()

done = False
while not done:
    link = ''
    while not link:
        link = input("Enter URL:\n")
    title = ''
    while not title:
        title = input("Enter title:\n")
    level = input("Enter level {}:\n".format(valid_levels))
    while not level in valid_levels:
        level = input("Please input a valid level {}\n".format(valid_levels))
    interest = input("Enter interest {}\n".format(valid_interests))
    while not interest in valid_interests:
        interest = input("Please input a valid interest {}\n".format(valid_interests))
    type = input("Enter type {}\n".format(valid_types))
    while not type in valid_types:
        type = input("Please input a valid type {}\n".format(valid_types))

    links.append({
        'link': link,
        'title': title,
        'options': {
            'level': level,
            'interest': interest,
            'type': type
        }
    })

    done_str = ""
    while done_str != 'y' and done_str != 'n':
        done_str = input("Done? (y/n)")
    if done_str == 'y':
        done = True

links_file = open("data/links.json", "w")
json.dump(links, links_file, indent=4, separators=(',', ': '))
links_file.close()

add_links_cmd = ['git', 'add', 'data/links.json']
subprocess.check_output(add_links_cmd)
commit_msg = "New links added by {}".format(username)
commit_links_cmd = ['git', 'commit', '-m', commit_msg]
subprocess.check_output(commit_links_cmd)
push_commit_cmd = ['git', 'push', '--set-upstream', 'origin', branch_name]
subprocess.check_output(push_commit_cmd)
