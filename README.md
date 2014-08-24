# Push-Pull
This code, viewable version on [http://pgjones.github.io/push-pull/](http://pgjones.github.io/push-pull/), is for the [third annual Github data challenge](https://github.com/blog/1864-third-annual-github-data-challenge).
It will plot statistics for the lifetimes of pull requests (or issues) for various users and as a function of commits, changes etc...

## Purpose
Pull requests live whilst they are reviewed, but what defines their lifetime.
I've presumed it is either a property of the reviewer, the author, or the pull request itself.
The project collates pull request data for a repository and displays the lifetimes.
The lifetimes are also shown as a function of the author, the reviewer, commits, changes, comments and github number (project lifetime).
What causes your pull requests to live for a long time, is it any of these?
For me... I seem to be the problem, the median lifetime is 1 week on average and 1 month for my pull requests :(.

### Tips
 - The pull requests/issues shown can be selected by lifetime, author or reviewer by selecting a lifetime, author, or reviewer.
 - The plots can be enlarged by double clicking.

## License
See LICENSE.txt, in summary this software is licensed under the [MIT license](http://opensource.org/licenses/MIT).
