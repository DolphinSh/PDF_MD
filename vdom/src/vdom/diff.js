import render from './render.js'

/**
 * 验证当前的数据中的属性值是否发生了改变
 * 
 * 一个一个对比当前属性是否缺失，以新对象验证旧对象
 */
const diffattrs = (oldAttrs, newAttrs) => {
    let patchs = [];

    for (const k in oldAttrs) {
        if (!(k in newAttrs)) { //效验新对象中是否还有旧对象的属性，如果新对象中没有这个属性，则用户去掉了当前属性，则干掉当前属性
            patchs.push(
                $node => {
                    $node.removeAttribute(k);
                    return $node;
                }
            )
        }
    }

    for (const [k, v] of Object.entries(newAttrs)) {
        if (!(k in oldAttrs)) { //效验旧对象中是否保函新对象的属性，如果没有，则设置新对象的属性
            patchs.push(
                $node => {
                    $node.setAttribute(k, v);
                    return $node;
                }
            )
        }
    }

    return $node => { //返回当前patch 集合
        for (const patch of patchs) { //便利所有的操作方法 处理$node
            patch($node);
        }
        return $node;
    }

}
/**
 * 比对数据中的children值是否发生了改变
 * 
 * 包括节点名 属性值 儿子节点
 *  
 * 明确一点：
 *        1. 首先我们children数组中的数据其实就是一个节点的大集合，需要用到递归处理每一条数据
 *        2. 子节点的数据必须由父节点来接盘
 *        3. 对比旧节点是否相同，直接递归diff方法
 *        4. 相对比旧节点，新节点多出数据则明显为新增的，我们直接插入到指定节点下            
 */
const diffchildren = (oldChild, newChild) => {
    let childPatches = [];

    if(oldChild.length!=newChild.length&&newChild.length==0){       //移除了节点
        childPatches.push(
            $node=>{
                $node.remove();
                return $node
            }
        )

    }

    for (let i = 0; i < Math.min(oldChild.length, newChild.length); i++) { //我们直接拿旧数据和新数据对比。在与旧数据节点长度相同的情况下，不管是新增的还是修改了属性的。全部使用diff对比，差异直接返回patch
        childPatches.push(diff(oldChild[i], newChild[i]))
    }

    let newChildPatchs = [] //新对象插入节点
    for (const newChild of newChild.slice(oldChild.length)) { //多余的节点直接插入父节点中
        newChildPatchs.push(
            $parent => {
                $parent.appendChild(render(newChild))
                return $parent
            }
        )
    }

    return $parent => {

         $parent.childNodes.forEach(($child, index) => { //直接找到旧节点中的儿子节点，并处理差异。
            childPatches[index]($child);
        })

        for (const patch of newChildPatchs) {
            patch($parent)
        }
        return $parent;
    }

}
/**
 * 算法对比核心方法
 * 
 * 拆分对比属性及节点 递归
 * 
 * 返回处理当前数据的方法 patch
 */
const diff = (oldVTree, newVTree) => {
    if (oldVTree == undefined) { //全部数据都不存在的情况，dom将会消失
        return $node => {
            $node.remove(); //直接删除当前dom模型 返回undefined
            return undefined
        }
    }

    if (oldVTree.tagName !== newVTree.tagName) { //当前vtree 节点发生了变化
        return $node => {
            const $nodeEl = render(newVTree); //直接采用当前最新的vtree 创建一个真实dom模型
            $node.replaceWith($nodeEl); //替换当前的dom模型
            return $nodeEl
        }
    }

    if (typeof oldVTree == "string" ||
        typeof newVTree == "string") { //如果当前节点只是一个文本节点,文本节点我们就没必要对比属性了，直接返回当前变化的tree
        if (oldVTree == newVTree) {
            return $node => $node //直接拿用最新数据创建成的dom模型
        } else { //不一样的情况下 我们直接使用最新的数据创建一个文本节点
            return $node => {
                const $nodeEl = render(newVTree); //直接采用当前最新的vtree 创建一个真实dom模型
                $node.replaceWith($nodeEl); //替换当前的dom模型
                return $nodeEl
            }
        }

    }

    //三种情况排除的情况下 我们对比属性

    const patchAttrs = diffattrs(oldVTree.attrs, newVTree.attrs);
    const patchChildren = diffchildren(oldVTree.children, newVTree.children);

    return $node => {
        patchAttrs($node);
        patchChildren($node);
        return $node;
    }
}
export default diff;