# Changing the homepage from Wix

Everything on the homepage comes from your Wix dashboard. Changes show on the next page refresh; you never need to re-upload or deploy the site.

There are three places:

1. **CMS → Homepage Content**: all text, buttons, links, section photos, which sections show, their order and how many items they show.
2. **Store Products → Categories → "Homepage …"**: which products appear in each homepage product section.
3. **CMS → Brides**: customer and bride photos and reviews (see `ADD-BRIDE-PHOTOS.md`).

## 1. Homepage Content (CMS)

Each row has a **Title** (the key, don't rename it), **Text**, **Link** and **Image**.

### Sections

| Section | Key | What it is |
|---|---|---|
| Big top photo | `hero` | Headline, two buttons, the featured dress |
| Promise strip | `promise` | 4 short promises |
| Category tiles | `tiles` | 5 big photo tiles (`tile.1` … `tile.5`) |
| Wedding Edit | `wedding` | Sliding row of product cards |
| Sanjh story | `story` | Photo + one line about the brand |
| Bridal circle | `circle` | Round photos for bridesmaids |
| Lookbook | `lookbook` | Large photo collage of products |
| How it works | `steps` | 3 steps + button |
| Reviews | `quote` | Customer reviews from CMS → Brides |
| Bride photos | `insta` | #SanjhShringarBride photo row |

For each section there are these rows:

| Row | Text to type | Effect |
|---|---|---|
| `<key>.show` | `yes` or `no` | Show or hide the whole section |
| `<key>.order` | a number | Position on the page. Lowest number goes first. Example: set `wedding.order` to `1` and `hero.order` to `2` to put the Wedding Edit at the top. |
| `<key>.count` | a number | How many items show (only `wedding`, `circle`, `lookbook`, `insta`; and `quote` if you add a `quote.count` row) |

`quote.show` is `auto`: the review section appears by itself as soon as an entry in CMS → Brides has a review. Set it to `no` to always hide it.

### Text and photos

- **Text**: type in the Text column. `*word*` makes a word italic; `|` starts a new line.
- **Buttons**: the Text is the label, the Link is where it goes (e.g. `shop.html?c=bridal`, `contact.html#book`).
- **Photos**: upload into the Image column of rows such as `hero.image`, `tile.1`, `story.image`. An empty photo slot uses a photo from the matching store collection.
- An empty Text hides that piece of text or button.

## 2. Choosing homepage products (Store categories)

In **Store Products → Categories**, these categories control the homepage. Add or remove products in them.

| Category | Homepage section | If empty |
|---|---|---|
| Homepage Hero | The dress featured in the top photo (first product) | First Bridal product |
| Homepage Wedding Edit | Wedding Edit row | Bridal products |
| Homepage Bridal Circle | Bridal circle round photos | Bridesmaids products |
| Homepage Lookbook | Lookbook collage | All products |

A product can be in a homepage category and its normal category at the same time.
