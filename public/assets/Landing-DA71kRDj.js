import"./maplibre-gl-DCtTgtxP.js";import{_ as h,c as r,r as n,o as s,w as t,a as e,b as f,F as g,d as w}from"./index-BG7K2Rhf.js";const E=`{
    "categories": [
        {
            "title": "ARTS & CIVIC ENGAGEMENT",
            "description": "We envision residents and community partners convening together to address shared values for the purposes of good governance, community development, and artistic expression."
        },
        {
            "title": "K12 SCHOOLS & EDUCATION",
            "enabled":true,
            "description": "We envision communities that offer quality elementary, secondary, post-secondary educational opportunities and academic achievement."
        },
        {
            "title": "TRANSITIONS TO ADULTHOOD",
            "description": "We envision communities where young adults have access to education and job opportunities."
        },
        {
            "title": "HEALTHY ECONOMY",
            "description": "We envision communities where people are able and willing to work, spend, earn, and invest."
        },
        {
            "title": "STRENGTHENING & SUPPORTING FAMILIES",
            "description": "We envision communities that offer empowering supports for family wellbeing, safe neighborhoods, and community trust."
        },
        {
            "title": "ACCESS TO HEALTHCARE",
            "description": "We envision communities where residents can easily access quality medical services and support."
        },
        {
            "title": "EARLY CHILDHOOD EDUCATION",
            "description": "We envision communities that offer health and educational supports for early learning and positive development of young children."
        },
        {
            "title": "HEALTHY LIVING",
            "description": "We envision communities where residents can easily make healthy lifestyle decisions, like eating fresh and nutritious food."
        },
        {
            "title": "GREEN SPACE, CLEAN AIR & WATER",
            "description": "We envision communities that offer parks, green spaces, and a clean environment that help increase outdoor recreation and overall well-being."
        },
        {
            "title": "TRANSPORTATION ACCESS",
            "description": "We envision communities where residents have a variety of safe transportation and commuting options."
        },
        {
            "title": "FAITH COMMUNITY",
            "description": "We envision communities where residents can participate in and support faith-based groups and organizations."
        }
    ]
}`,{categories:A}=JSON.parse(E),T={name:"Landing",components:{},data:()=>({categories:A}),watch:{},async mounted(){},methods:{}};function y(c,N,O,S,C,I){const o=n("v-carousel-item"),l=n("v-carousel"),d=n("v-card"),a=n("v-col"),p=n("v-btn"),m=n("v-sheet"),u=n("v-row"),v=n("v-container"),_=n("v-main");return s(),r(_,null,{default:t(()=>[e(v,{fluid:""},{default:t(()=>[e(u,null,{default:t(()=>[e(a,null,{default:t(()=>[e(d,null,{default:t(()=>[e(l,{cycle:"","show-arrows":"hover"},{default:t(()=>[e(o,{src:"slideshow/S1.jpg",cover:""}),e(o,{src:"slideshow/S2.jpg",cover:""}),e(o,{src:"slideshow/S4.jpg",cover:""})]),_:1})]),_:1})]),_:1}),e(a,null,{default:t(()=>[e(m,{class:"d-flex align-content-start flex-wrap","min-height":"3em"},{default:t(()=>[(s(!0),f(g,null,w(c.categories,i=>(s(),r(p,{to:"/map",disabled:!i.enabled,stacked:"",size:"small",class:"ma-2",width:"45%",key:i.title,text:i.title},null,8,["disabled","text"]))),128))]),_:1})]),_:1})]),_:1})]),_:1})]),_:1})}const H=h(T,[["render",y]]);export{H as default};
