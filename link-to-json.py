#!/usr/bin/env python3
# small command line tool for formatting info about a link into JSON

import json

valid_levels = [
    'none',
    'some',
    'lots'
]
valid_interests = [
    'android',
    'ios',
    'web'
]
valid_types = [
    'tutorial',
    'article',
    'video'
]

links_file = open("links.json", "r")
links = json.load(links_file)
links_file.close()

done = False
while not done:
    link = input("Enter URL:\n")
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

links_file = open("links.json", "w")
json.dump(links, links_file, indent=4, separators=(',', ': '))
