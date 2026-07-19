# CivFlow — On-Device Testing Checklist

I can't test your actual phone from here, so once this is deployed (or running locally on your network), run through this on a real device — ideally the phone a supervisor would actually use on site.

## Install as an app

- [ ] Open the site in Safari (iPhone) or Chrome (Android)
- [ ] iPhone: Share button → "Add to Home Screen". Android: browser menu → "Install app" / "Add to Home screen"
- [ ] Confirm the CivFlow icon looks right on your home screen (not a generic globe/broken image)
- [ ] Launch it from the home screen icon — it should open full-screen, no browser address bar
- [ ] Check the status bar area doesn't overlap the header on a notched phone (iPhone 14/15/16 Pro, etc.)

## Core capture flow (the one that matters most)

- [ ] Create a project, then "New site diary entry"
- [ ] Tap the photo dropzone — does it open the camera directly, or a gallery picker? Either is fine, just confirm it's not confusing
- [ ] Take 2-3 real photos and confirm thumbnails preview correctly
- [ ] Tap the record button, say a few sentences, tap stop — confirm "Voice note captured ✓" appears
- [ ] Submit the entry with one thumb, phone in one hand, like you're actually on site
- [ ] Run AI extraction and check the results are readable without zooming

## Offline behavior

- [ ] Turn on Airplane Mode, then open the app — you should see the amber "You're offline" banner, not a blank/broken screen
- [ ] Try creating a new entry while offline — you should get a clear error, not a silent hang
- [ ] Turn Airplane Mode back on, open a project you'd already visited before going offline — it should still display (this is the app-shell caching working)
- [ ] Reconnect and confirm everything goes back to normal without needing to force-quit the app

## Readability & touch

- [ ] Direct sunlight test if possible — is text still readable?
- [ ] Are buttons big enough to tap accurately with a gloved or dirty thumb? Flag any that feel too small
- [ ] Rotate to landscape briefly — nothing should look broken (not the primary use case, just shouldn't crash)
- [ ] Try pinch-zooming on a dense screen (like an entry with lots of extracted data) — should work, not be blocked

## Report back

For anything that feels off, the most useful info is: which phone/OS, which screen, and what you expected vs. what happened. I can usually fix layout/interaction issues quickly once I know what to look for — I just can't discover them myself without a real device.
