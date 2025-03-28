window.possibleImages = [
    "https://images.squarespace-cdn.com/content/v1/606d159a953867291018f801/1619987265163-9XILMVT3TK4HZ5X6538M/VH_01_1080pjpg.jpg",
    "https://w0.peakpx.com/wallpaper/130/204/HD-wallpaper-pokemon-emerald-starters-awesome-cool-fun-sweet.jpg",
    "https://images5.alphacoders.com/333/thumb-1920-333152.jpg",
    "https://images5.alphacoders.com/137/thumb-1920-1374411.jpg",
    "https://www.psu.com/wp/wp-content/uploads/2020/09/Minecraft-PS4-Wallpapers-16.jpg",
    "https://www.4p.de/wp-content/uploads/sites/13/2025/02/super-mario-64.jpg",
    "https://images5.alphacoders.com/511/511693.jpg",
    "https://www.gamewallpapers.com/wallpapers_slechte_compressie/wallpaper_kingdom_hearts_2_01_1680x1050.jpg",
    "https://wallpapers.com/images/hd/sonic-2-hd-dpqf4ipxbokd3qn0.jpg",
    "https://images7.alphacoders.com/987/987600.png",
    "https://images6.alphacoders.com/121/1217724.jpg",
    "https://steamuserimages-a.akamaihd.net/ugc/789735406717992934/98AFDA51F2AE8FE4CD992CC0D9DD97FDF8705BF0/",
    "https://pbs.twimg.com/media/GIusyQTXsAAOxcp?format=jpg&name=4096x4096",
    "https://images.alphacoders.com/662/thumb-1920-662393.jpg",
    "https://i0.wp.com/www.the-pixels.com/wp-content/uploads/2019/11/The-Legend-of-Zelda-Links-Awakening.png?fit=1920,1080&ssl=1",
    "https://i.postimg.cc/brpDKW61/bWkEzlW.png",
    "https://www.mariowiki.com/images/5/52/WL4_Main_Artwork.jpg?bbf96",
    "https://i.imgur.com/VxBbuhP.jpeg", //"https://i.imgur.com/iX9YjeW.png",
    "https://i.imgur.com/gxevyQa.jpeg",
    "https://cdn.banjokazooiewiki.com/1/1e/Banjo-Kazooie_NA_box_cover.png",
    "https://static.wikitide.net/megamanwiki/b/b7/Normal_bn3white_promo.jpg",
    "https://cdn.factorio.com/assets/img/artwork/0.17-stable.png",
    "https://georgetownvoice.com/wp-content/uploads/2024/04/balatro1080-1709897236354.png",
    "https://r4.wallpaperflare.com/wallpaper/311/148/963/final-fantasy-final-fantasy-x-auron-final-fantasy-braska-final-fantasy-wallpaper-e97098dd31ca3dab56d7289f7051469d.jpg",
]
console.log("Loaded images!");

const imageGrid = document.getElementById("imageGrid");
if(imageGrid) {
    window.possibleImages.forEach((image, index) => {
        const div = document.createElement("div");
        div.classList.add("image-item");
        div.innerHTML = `<img src="${image}" alt="Image ${index + 1}">
                            <div class="image-label">${index + 1}</div>`;
        imageGrid.appendChild(div);
    });
}
