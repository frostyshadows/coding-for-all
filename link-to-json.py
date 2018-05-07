# small command line tool for formatting info about a link into JSON

link = input("Enter URL\n")
title = input("Enter title\n")
level = input("Enter level (none OR some OR lots)\n")
interest = input("Enter interest (android OR ios OR web)\n")
type = input("Enter type (tut OR art OR vid)\n")

print("{\"link\": \"%s\", \"title\": \"%s\", \"options\": {\"level\": \"%s\", \"interest\": \"%s\", \"type\": \"%s\"}}" % (link, title, level, interest, type))
