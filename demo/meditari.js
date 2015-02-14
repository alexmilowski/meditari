function Meditari() {
   
}

Meditari.toolbar = [
   { role: "info", text: "?", title: "Information" },
   { role: "location", text: "⌖", title: "Location" }
]

Meditari.actions ={
   "info": function(target) {
      var data = target.photo.ownerDocument.data;
      var dateCreated = data.getValues(target.photo.data.id,"http://schema.org/dateCreated");
      var description = data.getValues(target.photo.data.id,"http://schema.org/description");
      var contentLocation = data.getValues(target.photo.data.id,"http://schema.org/contentLocation");
      //console.log(dateCreated);
      //console.log(contentLocation);
      //console.log(description);
      var info = document.createElement("div");
      target.wrapper.appendChild(info);
      //info.style.width = target.photo.width+"px";
      info.className = "meditari-info";

      var tpos = dateCreated[0].indexOf("T");
      var location = document.createE
      var infoContents = document.createElement("p");
      info.appendChild(infoContents);
      var text = "taken at "+dateCreated[0].substring(tpos+1)+" on "+dateCreated[0].substring(0,tpos);
      if (description.length>0) {
         text = description+"<br/>"+text;
      }
      infoContents.innerHTML = text;
      if (contentLocation.length>0) {
         var mapDiv = document.createElement("div");
         mapDiv.className = "meditari-location-map"
         info.appendChild(mapDiv);
         geo = data.getValues(contentLocation[0],"http://schema.org/geo")
         latitude = data.getValues(geo[0],"http://schema.org/latitude");
         longitude = data.getValues(geo[0],"http://schema.org/longitude");
         target.map = L.map(mapDiv).setView([latitude[0], longitude[0]], 17);
         L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
             attribution: '<a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
         }).addTo(target.map);
         L.marker([latitude[0], longitude[0]]).addTo(target.map);

         target.wrapper.meditariUpdate = function() {
            if (target.map) {
               target.map.invalidateSize();
            }
         }
         
      }
      target.info = info;
   },
   "comment" : function(target) {
      var data = target.photo.ownerDocument.data;
      var comments = data.getValues(target.photo.data.id,"http://schema.org/comment");
      for (var i=0; i<comments.length; i++) {
         //console.log("Comment "+comments[i]);
         target.instance.annotateImageBySubject(target,comments[i]);
      }        
   }
}

Meditari.prototype.apply = function(doc) {
   var photos = document.getElementsByType("http://schema.org/Photograph");
   this.graph = doc.data.graph;
   this.photographs = {};
   for (var i=0; i<photos.length; i++) {
      var photo = photos[i];
      photo.draggable = false;
      var container = photo.parentNode;
      var item = {
         id : photo.data.id,
         photo: photo,
         wrapper: document.createElement("div"),
         instance: this,
         regions: []
      };
      this.photographs[item.id] = item;
      item.wrapper.className = "meditari-photograph";
      container.replaceChild(item.wrapper,item.photo);
      item.wrapper.appendChild(item.photo);
      this.addRegionTracker(item);
      this.addAnnotator(item);
   }
   var galleries = document.getElementsByType("http://schema.org/ImageGallery");
   for (var i=0; i<galleries.length; i++) {
      var container = galleries[i];
      this.makeGallery(container);
   }
}

Meditari.prototype.makeGallery = function(container) {
   container.setAttribute("tabindex","1");
   var gallery = {
      index: 0,
      items: []
   }
   for (var c=0; c<container.childNodes.length; c++) {
      if (container.childNodes[c].nodeType==Node.ELEMENT_NODE) {
         gallery.items.push(container.childNodes[c]);
         container.childNodes[c].style.display = "none";
      }
   }
   gallery.items[gallery.index].style.display = "block";
   container.addEventListener("keyup",function(e) {
      if (e.altKey && e.keyCode==37) {
         if (gallery.index>0) {
            gallery.items[gallery.index].style.display = "none";
            gallery.index--;
            gallery.items[gallery.index].style.display = "block";
         }
      } else if (e.altKey && e.keyCode==39) {
         if ((gallery.index+1)<gallery.items.length) {
            gallery.items[gallery.index].style.display = "none";
            gallery.index++;
            gallery.items[gallery.index].style.display = "block";
         }
      }
      if (gallery.items[gallery.index].meditariUpdate) {
         gallery.items[gallery.index].meditariUpdate();
      }
   },false);
}

Meditari.prototype.annotateImageBySubject = function(target,commentSubject) {
   var data = target.photo.ownerDocument.data;
   var text = data.getValues(commentSubject,"http://schema.org/text")[0];
   var posx = data.getValues(commentSubject,"http://schema.org/x")[0];
   var posy = data.getValues(commentSubject,"http://schema.org/y")[0];
   var width = data.getValues(commentSubject,"http://schema.org/width")[0];
   var height = data.getValues(commentSubject,"http://schema.org/height")[0];
   this.annotateImage(target,posx,posy,width,height,text);
}

Meditari.prototype.annotateImage = function(target,posx,posy,width,height,text) {
   var annotation = document.createElement("div");
   annotation.className ="meditari-annotation";
   annotation.style.width = width+"px";
   annotation.style.height = height+"px";
   annotation.style.position = "absolute";
   annotation.style.display = "none";
   comment = document.createElement("div");
   target.info.appendChild(comment);
   comment.className = "meditari-comment";
   comment.style.display = "none";
   comment.appendChild(document.createTextNode(text));
   target.wrapper.appendChild(annotation,target.photo);
   this.addImageRegion(
      target,
      posx,posy,width,height,
      function(target,region) {
         annotation.style.display = "block";
         annotation.style.left = (target.photo.offsetLeft+region.x)+"px";
         annotation.style.top = (target.photo.offsetTop+region.y)+"px";
         comment.style.display = "block";
      },
      function() {
         annotation.style.display = "none";
         comment.style.display = "none";
      }
   );
}

Meditari.prototype.addImageRegion = function(item,x,y,width,height,enterAction,leaveAction) {
   item.regions.push({
      x: x, y: y, width: width, height: height, enter: enterAction, leave: leaveAction, active: false,
      box: [[x,y], [x+width,y], 
            [x+width,y+height],[x,y+height]]
   });
}

Meditari.prototype.addRegionTracker = function(target) {
   target.photo.addEventListener("mousemove",function(e) {
      for (var i=0; i<target.regions.length; i++) {
         var x = e.clientX-target.photo.offsetLeft;
         var y = e.clientY-target.photo.offsetTop;
         //console.log("x: "+x+" vs "+target.regions[i].box[0][0]+","+target.regions[i].box[1][0]);
         //console.log("y: "+y+" vs "+target.regions[i].box[0][1]+","+target.regions[i].box[2][1]);
         if (x>=target.regions[i].box[0][0] && x<=target.regions[i].box[1][0] &&
             y>=target.regions[i].box[0][1] && y<=target.regions[i].box[2][1]) {
            if (!target.regions[i].active) {
               target.regions[i].enter(target,target.regions[i]);
               target.regions[i].active = true;
            }
         } else {
            if (target.regions[i].active) {
               target.regions[i].leave(target,target.regions[i]);
               target.regions[i].active = false;
            }
         }
      }
   },false);
}

Meditari.prototype.addAnnotator = function(target) {
   var state = { };
   target.photo.addEventListener("mousedown",function(e) {
      state.startX = e.clientX-target.photo.offsetLeft;
      state.startY = e.clientY+target.photo.offsetTop;
   },false);
   target.photo.addEventListener("mouseup",function(e) {
      state.endX = e.clientX-target.photo.offsetLeft;
      state.endY = e.clientY+target.photo.offsetTop;
      var width = Math.abs(state.endX - state.startX);
      var height = Math.abs(state.endY - state.startY);
      var x = state.startX<state.endX ? state.startX : state.endX;
      var y = state.startY<state.endY ? state.startY : state.endY;
      var text = target.instance.solicitText();
      console.log(document.baseURI);
      var baseURI = document.data.parseURI(document.baseURI);
      var photoURI = document.data.parseURI(target.photo.data.id);
      var json = {
         "@context" : "http://schema.org/",
         "@id" : photoURI.relativeTo(baseURI),
         "comment" : {
             "text" : text,
             "x" : x, "y": y,
             "width": width, "height": height
         }
      }
      console.log(JSON.stringify(json,null," "));
      target.instance.annotateImage(target,x,y,width,height,text);
   },false);
}

Meditari.prototype.solicitText = function() {
   return "I am a comment!";
}

Meditari.instance = new Meditari();

Meditari.apply = function(doc) {
   Meditari.instance.apply(doc);
}

document.addEventListener("rdfa.loaded",function() {
   Meditari.apply(document);
},false)
document.addEventListener("rdfa.updated",function(e) {
   if (e.detail.types.indexOf("http://schema.org/Photograph")<0) {
      return;
   }
   console.log("Data for "+e.detail.id+" loaded");
   var item = Meditari.instance.photographs[e.detail.id];
   if (item == null) {
      return;
   }
   for (var key in Meditari.actions) {
      Meditari.actions[key](item);
   }
},false);
