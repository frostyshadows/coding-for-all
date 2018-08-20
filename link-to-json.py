#!/usr/bin/env python3
# small command line tool for formatting info about a link into JSON

import json

links_file = open("links.json", "r")
links = json.load(links_file)
links_file.close()

link = input("Enter URL:\n")
title = input("Enter title:\n")
level = input("Enter level (none OR some OR lots):\n")
interest = input("Enter interest (android OR ios OR web):\n")
type = input("Enter type (tutorial OR article OR video):\n")

added_info = {
    'link': link,
    'title': title,
    'options': {
        'level': level,
        'interest': interest,
        'type': type
    }
}

links.append(added_info)
links_file = open("links.json", "w")
json.dump(links, links_file, indent=4, separators=(',', ': '))
