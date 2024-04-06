import {Node} from "./parser";

import parse from "./index";

import DOMPurify from "isomorphic-dompurify";
import hljs from "highlight.js";

type findPageFn = (name: string) => Promise<{content: string}> | null;
type findImageFn = (name: string) => Promise<{url: string, width: number, height: number}> | null;
type getURLFn = (type: 'link' | 'image', name: string) => string;
type pageCountFn = (name: string) => Promise<number>;

export class Renderer {
    public findPage: findPageFn = () => null;
    public findImage: findImageFn = () => null;
    public getURL: getURLFn = (type: 'link' | 'image', name: string) => (type === 'link' ? '/wiki/' : '/files/') + name;
    public pageCount: pageCountFn = async () => 0;

    public categories: string[] = [];
    public backlinks: {type: 'link' | 'image' | 'category', name: string}[] = [];

    public footnoteIds: string[] = [];
    public footnotes: {id: string, name: string, content: string}[] = [];
    public headers: {name: string, closed: boolean, id: string, size: number, count: string}[] = [];
    public headerCounters: number[] = [0, 0, 0, 0, 0, 0];

    public param: {[str: string]: string} | null = null;

    constructor(findPage?: findPageFn, findImage?: findImageFn, getURL?: getURLFn, pageCount?: pageCountFn){
        if(findPage) this.findPage = findPage;
        if(findImage) this.findImage = findImage;
        if(getURL) this.getURL = getURL;
        if(pageCount) this.pageCount = pageCount;
    }

    private error(error: string){
        return `<span class="wiki-error">${error}</span>`;
    }

    private removeHTML(str: string): string {
        return str.replace(/(<([^>]+)>)/gi, '');
    }

    private disableQuot(str: string): string {
        return str.replace(/"/, '&quot;');
    }

    private disableTag(str: string): string {
        return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    private async getHTML(nodes: Node[]){
        return (await Promise.all(nodes.map((node: Node) => this.walk(node)))).join('');
    }    

    private async walk(node: Node): Promise<string> {
        switch(node.type){
            case 'Literal': {
                if(node.value === '\n') return '<br />';

                return this.disableTag(node.value);
            }
            
            case 'Heading': {
                const name = await this.getHTML(node.items);

                this.headerCounters[node.depth-1]++;
                for(let i = node.depth; i < 6; i++)  this.headerCounters[i] = 0;
                const counts = [];
                for(let i = 0; i < node.depth; i++) counts.push(this.headerCounters[i]);

                const id = counts.join('.');

                this.headers.push({
                    name: this.removeHTML(name),
                    closed: !node.folding,
                    id,
                    size: node.depth,
                    count: id+'.'
                });
                
                return `<h${node.depth} id="s-${id}" class="wiki-heading${node.folding ? ' wiki-close-heading' : ''}"><a href="#toc">${id}.</a> ${name}</h${node.depth}>`;
            }

            case 'Block': {
                return `<div style="${this.disableQuot(node.style)}">${await this.getHTML(node.items)}</div>`;
            }

            case 'Html': {
                return DOMPurify.sanitize(node.value);
            }

            case 'Folding': {
                return `<details class="wiki-folding"><summary>${await this.getHTML(node.names)}</summary>${await this.getHTML(node.items)}</details>`;
            }

            case 'Syntax': {
                let hignlightd: string;

                try {
                    hignlightd = hljs.highlight(node.value, {language: node.name.trim()}).value;
                } catch(err){
                    hignlightd = hljs.highlightAuto(node.value).value;
                }

                return `<pre class="wiki-code">${hignlightd}</pre>`;
            }

            case 'Color': {
                return `<span style="color: ${this.disableQuot(node.color.split(',')[0])}">${await this.getHTML(node.items)}</span>`;
            }

            case 'Size': {
                return `<span class="wiki-size ${node.size > 0 ? 'size-up-'+node.size : 'size-down-'+Math.abs(node.size)}">${await this.getHTML(node.items)}</span>`;
            }

            case 'HorizontalLine': {
                return '<hr />';
            }

            case 'HyperLink': {
                const externalLink = node.link.startsWith('https://') || node.link.startsWith('http://');

                if(!externalLink) this.backlinks.push({type: 'link', name: node.link});
                
                const notExist = !(externalLink ? null : await this.findPage(node.link));

                return `<a href="${this.disableQuot(externalLink ? node.link : this.getURL('link', node.link))}" class="wiki-link${externalLink ? ' external-link' : (notExist ? ' not-exist' : '')}">${await this.getHTML(node.items)}</a>`;
            }

            case 'Category': {
                this.backlinks.push({type: 'category', name: node.link});
                this.categories.push(node.link);

                return '';
            }

            case 'Image': {
                this.backlinks.push({type: 'image', name: node.link});

                const image = await this.findImage(node.link);

                if(!image){
                    return `<a href="${this.disableQuot(this.getURL('link', node.link))}" class="wiki-link not-exist">${node.link}</a>`;
                }
                
                return `<img src="${this.getURL('image', image.url)}" style="${this.disableQuot(
                    (node.param['align'] ? 'text-align: '+node.param['align'] : '') + ';' + 
                    (node.param['bgcolor'] ? 'background-color: '+node.param['bgcolor'] : '') + ';' + 
                    (node.param['border-radius'] ? 'border-radius: '+node.param['bgcolor'] : '') + ';' + 
                    (node.param['rendering'] ? 'image-rendering: '+node.param['bgcolor'] : '') + ';'
                )}" width="${node.param['width'] ? this.disableQuot(node.param['width']) : image.width}" height="${node.param['height'] ? this.disableQuot(node.param['height']) : image.height}" />`;
            }
            
            case 'Bold': {
                return `<b>${await this.getHTML(node.items)}</b>`;
            }

            case 'Italic': {
                return `<i>${await this.getHTML(node.items)}</i>`;
            }

            case 'Underscore': {
                return `<u>${await this.getHTML(node.items)}</u>`;
            }

            case 'Strikethrough': {
                return `<del>${await this.getHTML(node.items)}</del>`;
            }

            case 'SuperScript': {
                return `<sup>${await this.getHTML(node.items)}</sup>`;
            }

            case 'SubScript': {
                return `<sub>${await this.getHTML(node.items)}</sub>`;
            }

            case 'Video': {
                switch(node.name){
                    case 'youtube':
                        return `<iframe src="https://www.youtube.com/embed/${encodeURIComponent(node.code)}${
                            node.param['start'] ? '?start='+encodeURIComponent(node.param['start']) : ''
                        }${node.param['end'] ? ((node.param['start'] ? '&' : '?') + 'end=' + encodeURIComponent(node.param['end'])) : ''}"${(
                            node.param['width'] ? ' width="'+this.disableQuot(node.param['width'])+'"' : ''
                        )}${(
                            node.param['height'] ? ' width="'+this.disableQuot(node.param['height'])+'"' : ''
                        )} frameborder="0" allowfullscreen loading="lazy"></iframe>`;
                
                    case 'kakaotv':
                        return `<iframe src="https//tv.kakao.com/embed/player/cliplink/${encodeURIComponent(node.code)}"${(
                            node.param['width'] ? ' width="'+this.disableQuot(node.param['width'])+'"' : ''
                        )}${(
                            node.param['height'] ? ' width="'+this.disableQuot(node.param['height'])+'"' : ''
                        )} frameborder="0" allowfullscreen loading="lazy"></iframe>`;

                    case 'nicovideo':
                        return `<iframe src="https//embed.nicovideo.jp/watch/sm${encodeURIComponent(node.code)}"${(
                            node.param['width'] ? ' width="'+this.disableQuot(node.param['width'])+'"' : ''
                        )}${(
                            node.param['height'] ? ' width="'+this.disableQuot(node.param['height'])+'"' : ''
                        )} frameborder="0" allowfullscreen loading="lazy"></iframe>`;

                    case 'vimeo':
                        return `<iframe src="https//player.vimeo.com/video/${encodeURIComponent(node.code)}"${(
                            node.param['width'] ? ' width="'+this.disableQuot(node.param['width'])+'"' : ''
                        )}${(
                            node.param['height'] ? ' width="'+this.disableQuot(node.param['height'])+'"' : ''
                        )} frameborder="0" allowfullscreen loading="lazy"></iframe>`;

                    case 'navertv':
                        return `<iframe src="https//tv.naver.com/embed/${encodeURIComponent(node.code)}"${(
                            node.param['width'] ? ' width="'+this.disableQuot(node.param['width'])+'"' : ''
                        )}${(
                            node.param['height'] ? ' width="'+this.disableQuot(node.param['height'])+'"' : ''
                        )} frameborder="0" allowfullscreen loading="lazy"></iframe>`;

                    default:
                        return '';
                }
            }

            case 'FootNote': {
                let name = node.name;
                let id = node.name;

                if(!name){
                    for(name = '1'; this.footnoteIds.includes(name); name = String(+name + 1));

                    id = name;
                } else {
                    let i;

                    for(i = 0; this.footnoteIds.includes(node.name + (i === 0 ? '' : '_'+i)); i++);

                    id = node.name + (i === 0 ? '' : '_'+i);
                }

                this.footnoteIds.push(name);

                this.footnotes.push({
                    id, name, content: await this.getHTML(node.items)
                });

                return `<sup id="fn-${encodeURIComponent(id)}"><a href="#rfn-${encodeURIComponent(id)}">[${name}]</a></sup>`;
            }

            case 'BlockQuote': {
                return `<blockquote class="wiki-quote">${await this.getHTML(node.items)}</blockquote>`;
            }

            case 'Indent': {
                return `<div class="wiki-indent">${await this.getHTML(node.items)}</div>`;
            }

            case 'Include': {
                if(this.param) return '';

                const page = await this.findPage(node.name);

                if(!page) return this.error(`'${node.name}' 문서가 없습니다.`);

                const renderer = new Renderer(this.findPage, this.findImage, this.getURL);

                return await renderer.run(parse(page.content), node.param);
            }

            case 'Param': {
                if(!this.param) return await this.getHTML(node.items);

                return this.param[node.name] || await this.getHTML(node.items);
            }

            case 'Age': {
                return `Age: <time datetime="${this.disableQuot(node.date)}" />(birthday)`;
            }

            case 'Dday': {
                return `Dday: <time datetime="${this.disableQuot(node.date)}" />(start time)`;
            }

            case 'PageCount': {
                return String(await this.pageCount(node.name));
            }

            case 'Ruby': {
                return `<ruby>${await this.getHTML(node.items)}<rp>(</rp><rt>${
                    node.param['color'] ? '<span style="color: '+this.disableQuot(node.param['color'])+'">'+(node.param['ruby'] || '')+'</span>' 
                    : node.param['ruby'] || ''
                }</rt><rp>)</rp></ruby>`;
            }

            case 'Math': {
                return `<katex data-latex="${this.disableQuot(node.value)}">${this.disableTag(node.value)}</katex>`;
            }

            case 'DateTime': {
                return `<time datetime="${new Date().getTime()}" />`;
            }

            case 'TableOfContents': {
                return '<section class="wiki-toc" id="toc"><h2>목차</h2>' + this.headers.map(header => 
                    `<div class="wiki-toc-item wiki-toc-indent-${header.size}"><a href="#s-${header.id}">${header.count}.</a> ${header.name}</div>`
                ).join('') + '</section>';
            }

            case 'TableOfFootnotes': {
                return '<section class="wiki-footnotes"><ol>' + this.footnotes.map(footnote => 
                    `<li id="rfn-${encodeURIComponent(footnote.id)}"><a href="#fn-${encodeURIComponent(footnote.id)}">[${footnote.name}]</a> <span>${footnote.content}</span></li>`
                ).join('') + '</ol></section>';
            }

            case 'ClearFix': {
                return '<div style="clear: both" />';
            }

            case 'Table': {
                return `<table class="wiki-table" style="${this.disableQuot(
                    (node.param['width'] ? 'width: '+node.param['width']+';' : '') +
                    (node.param['bgcolor'] ? 'background-color: '+node.param['bgcolor']+';' : '') +
                    (node.param['color'] ? 'color: '+node.param['color']+';' : '') +
                    (node.param['bordercolor'] ? 'border-color: '+node.param['bordercolor']+';' : '') +
                    (node.param['align'] ? 'text-align: '+node.param['align']+';' : '')
                )}">`+(
                    node.names.length > 0 ? `<caption>${await this.getHTML(node.names)}</caption>` : ''
                )+'<tbody>' + (await Promise.all(node.items.map(async row => 
                    `<tr style="${this.disableQuot(
                        (row.param['bgcolor'] ? 'background-color: '+row.param['bgcolor']+';' : '') +
                        (row.param['color'] ? 'color: '+row.param['color']+';' : '')
                    )}">`+(await Promise.all(row.items.map(async cell => 
                        `<td ${
                            cell.param['colspan'] ? 'colspan="'+this.disableQuot(cell.param['colspan'])+'" ' : ''
                        }${
                            cell.param['rowspan'] ? 'rowspan="'+this.disableQuot(cell.param['rowspan'])+'" ' : ''
                        }${
                            cell.param['colbgcolor'] ? 'data-colbgcolor="'+this.disableQuot(cell.param['colbgcolor'])+'" ' : ''
                        }${
                            cell.param['colcolor'] ? 'data-colcolor="'+this.disableQuot(cell.param['colcolor'])+'" ' : ''
                        }style="${this.disableQuot(
                            (cell.param['vertical-align'] ? 'vertical-align: '+cell.param['vertical-align']+';' : '') +
                            (cell.param['width'] ? 'width: '+cell.param['width']+';' : '') +
                            (cell.param['height'] ? 'height: '+cell.param['height']+';' : '') +
                            (cell.param['align'] ? 'text-align: '+cell.param['align']+';' : 'text-align: center;') +
                            (cell.param['nopad'] ? 'padding: 0;' : '') +
                            (cell.param['bgcolor'] ? 'background-color: '+cell.param['width']+';' : '') +
                            (cell.param['color'] ? 'color: '+cell.param['color']+';' : '')
                        )}">`+ await this.getHTML(cell.items) +'</td>'
                    ))).join('') + '</tr>'
                ))).join('') + '</tbody></table>';
            }

            case 'List': {
                return '<ul class="wiki-list">' + (await Promise.all(node.items.map(async item => {
                    if(item.type === 'ListItem'){
                        return `<li class="${
                            item.name === '1.' ? 'wiki-list-decimal' : 
                            item.name === 'a.' ? 'wiki-list-alpha' : 
                            item.name === 'A.' ? 'wiki-list-upper-alpha' : 
                            item.name === 'i.' ? 'wiki-list-roman' : 
                            item.name === 'I.' ? 'wiki-list-upper-roman' : 
                            ''
                        }">${await this.getHTML(item.items)}</li>`
                    }

                    return await this.walk.bind(this)(item);
                }))).join('') + '</ul>';
            }

            default: {
                return '';
            }
        }
    }

    public async run(nodes: Node[], param: {[str: string]: string} | null = null){
        this.categories = [];
        this.backlinks = [];
        this.param = param;
    
        this.footnoteIds = [];
        this.footnotes = [];

        this.headers = [];
        this.headerCounters = [0, 0, 0, 0, 0, 0];

        let html = await this.getHTML(nodes);

        if(this.footnotes.length > 0){
            html += await this.walk(new Node('TableOfFootnotes', {}));
        }

        return html;
    }
}