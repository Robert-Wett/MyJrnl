#TODO
* Use args.slice to combine input and remove the need to have to actually quote entries.
* Figure out a way to represent bang/! without triggering the history command for bash.
* Potentially implement a subset of the markdown commands? Or just accept full markdown via plugin?
  * The `@` sign has no significance in Markdown (I think)
* Standardize the `entry` properties. I'm thinking `month`, `day`, `title`, `subtitle`, `body`.
  * Tricky part will be how to nicely render this on the front-end given that title or subtitle aren't given. This is kind of the normal workflow, at least for me, where I'm just firing off thoughts vs. full on blog-posts or entries worthy of a title/subtitle.

----

#Thoughts/Thinking out loud
* Add a new escape character to tag twitter names (@@).
  * `>> journal @@robwett is the absolute worst. @terriblepeople"
